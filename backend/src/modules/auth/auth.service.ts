import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import { GuestLoginDto } from "@/modules/users/dto/guest-login.dto";
import { UsersService } from "@/modules/users/users.service";
import { Prisma, User } from "@generated/prisma/client";
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createPublicKey, randomBytes, verify } from "crypto";
import { CookieOptions, Request, Response } from "express";
import { AuthPayload } from "./types/auth-payload.type";
import type { SafeUser } from "./types/safe-user.type";

const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);
const GOOGLE_OPENID_CONFIGURATION_URL =
  "https://accounts.google.com/.well-known/openid-configuration";
const GOOGLE_STATE_COOKIE_NAME = "google_oauth_state";
const GOOGLE_STATE_COOKIE_TTL_MS = 10 * 60 * 1000;

type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleIdTokenHeader = {
  alg: string;
  kid?: string;
};

type GoogleIdTokenPayload = {
  aud: string | string[];
  email?: string;
  email_verified?: boolean | string;
  exp: number;
  iss: string;
  name?: string;
  picture?: string;
  sub: string;
};

type VerifiedGoogleIdTokenPayload = GoogleIdTokenPayload & {
  email: string;
};

type GoogleTokenResponse = {
  id_token?: string;
};

type GoogleJwk = import("crypto").JsonWebKey & {
  kid?: string;
};

type GoogleOidcConfiguration = {
  jwks_uri: string;
  token_endpoint: string;
};

type GoogleStateCookiePayload = {
  nonce: string;
  returnTo: string;
};

@Injectable()
export class AuthService {
  private googleOidcConfiguration: GoogleOidcConfiguration | null = null;
  private googleJwksCache:
    | {
        expiresAt: number;
        keys: GoogleJwk[];
      }
    | null = null;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException("Email inconnu");
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException("Mot de passe est incorrect");
    }

    return user;
  }

  private sanitizeUser(user: User): SafeUser {
    const { googleId, password, ...safeUser } = user;
    return safeUser;
  }

  private getAuthCookieOptions(): CookieOptions {
    const isSecureCookie = process.env.FRONTEND_ORIGIN?.startsWith("https://");

    return {
      httpOnly: true,
      path: "/",
      sameSite: isSecureCookie ? "none" : "lax",
      secure: Boolean(isSecureCookie),
    };
  }

  private getGoogleStateCookieOptions(): CookieOptions {
    return {
      ...this.getAuthCookieOptions(),
      maxAge: GOOGLE_STATE_COOKIE_TTL_MS,
      path: "/auth/google",
      sameSite: "lax",
    };
  }

  private getFrontendOrigin(): string {
    return process.env.FRONTEND_ORIGIN || "https://localhost:3000";
  }

  private getGoogleConfig(): GoogleConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Google OAuth is not fully configured");
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
    };
  }

  private sanitizeReturnTo(rawReturnTo?: string): string {
    if (!rawReturnTo || !rawReturnTo.startsWith("/") || rawReturnTo.startsWith("//")) {
      return "/";
    }

    try {
      const parsedUrl = new URL(rawReturnTo, "https://transcendance.local");
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    } catch {
      return "/";
    }
  }

  private storeGoogleState(res: Response, payload: GoogleStateCookiePayload): void {
    res.cookie(
      GOOGLE_STATE_COOKIE_NAME,
      JSON.stringify(payload),
      this.getGoogleStateCookieOptions(),
    );
  }

  private clearGoogleState(res: Response): void {
    res.clearCookie(GOOGLE_STATE_COOKIE_NAME, this.getGoogleStateCookieOptions());
  }

  private readGoogleState(req: Request): GoogleStateCookiePayload | null {
    const rawCookie = req.cookies?.[GOOGLE_STATE_COOKIE_NAME];

    if (typeof rawCookie !== "string" || rawCookie.length === 0) {
      return null;
    }

    try {
      const parsedCookie = JSON.parse(rawCookie) as Partial<GoogleStateCookiePayload>;

      if (
        typeof parsedCookie.nonce !== "string" ||
        typeof parsedCookie.returnTo !== "string"
      ) {
        return null;
      }

      return {
        nonce: parsedCookie.nonce,
        returnTo: this.sanitizeReturnTo(parsedCookie.returnTo),
      };
    } catch {
      return null;
    }
  }

  private async ensureUserIsOnline(user: User): Promise<User> {
    if (user.status === "online") {
      return user;
    }

    return this.usersService.updateUser({
      where: { id: user.id },
      data: { status: "online" },
    });
  }

  async login(user: User, res: Response): Promise<SafeUser> {
    const updatedUser = await this.ensureUserIsOnline(user);
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    res.cookie("access_token", accessToken, this.getAuthCookieOptions());

    return this.sanitizeUser(updatedUser);
  }

  async register(dto: RegisterDto, res: Response): Promise<SafeUser> {
    const email = dto.email.trim();
    const username = dto.username.trim();
    const existingEmail = await this.usersService.findUserByEmail(email);

    if (existingEmail) {
      if (existingEmail.googleId) {
        throw new ConflictException(
          "Cet email est deja lie a Google. Utilise la connexion Google.",
        );
      }

      throw new ConflictException("Email already exists");
    }

    const existingUsername = await this.usersService.findUserByUsername(username);

    if (existingUsername) {
      throw new ConflictException("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.usersService.createUser({
        email,
        username,
        password: hashedPassword,
        createdAt: new Date(),
      });

      return this.login(user, res);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target
          : [];

        if (target.includes("username")) {
          throw new ConflictException("Username already exists");
        }

        throw new ConflictException("Email already exists");
      }

      throw error;
    }
  }

  async loginAsGuest(dto: GuestLoginDto, res: Response): Promise<SafeUser> {
    const username = dto.username.trim();
    const existingUser = await this.usersService.findUserByUsername(username);

    if (existingUser) {
      if (existingUser.isGuest && existingUser.status === "offline") {
        await this.archiveGuestIdentity(existingUser.id);
      } else {
        throw new ConflictException("Username already exists");
      }
    }

    const generatedPassword = randomBytes(24).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const guestIdentifier = randomBytes(8).toString("hex");
    const guestUser = await this.usersService.createUser({
      email: `guest-${guestIdentifier}@guest.local`,
      username,
      password: hashedPassword,
      isGuest: true,
      createdAt: new Date(),
    });

    return this.login(guestUser, res);
  }

  buildGoogleFailureRedirect(returnTo: string, errorCode: string): string {
    const loginUrl = new URL("/login", this.getFrontendOrigin());
    const joinRoomMatch =
      /^\/rooms\/(\d+)(?:\?(?:.*&)?join=1(?:&.*)?)?$/.exec(returnTo);

    loginUrl.searchParams.set("oauthError", errorCode);

    if (joinRoomMatch) {
      loginUrl.searchParams.set("joinRoom", joinRoomMatch[1]);
    }

    return loginUrl.toString();
  }

  buildGoogleAuthorizationUrl(res: Response, rawReturnTo?: string): string {
    const googleConfig = this.getGoogleConfig();
    const returnTo = this.sanitizeReturnTo(rawReturnTo);
    const nonce = randomBytes(24).toString("hex");
    const authorizationUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    this.storeGoogleState(res, {
      nonce,
      returnTo,
    });

    authorizationUrl.searchParams.set("client_id", googleConfig.clientId);
    authorizationUrl.searchParams.set("redirect_uri", googleConfig.redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid email profile");
    authorizationUrl.searchParams.set("state", nonce);
    authorizationUrl.searchParams.set("prompt", "select_account");

    return authorizationUrl.toString();
  }

  async handleGoogleCallback(req: Request, res: Response): Promise<string> {
    const stateCookie = this.readGoogleState(req);
    const requestedState =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const callbackError =
      typeof req.query.error === "string" ? req.query.error : undefined;
    const authorizationCode =
      typeof req.query.code === "string" ? req.query.code : undefined;
    const returnTo = stateCookie?.returnTo ?? "/";

    this.clearGoogleState(res);

    if (!stateCookie || !requestedState || requestedState !== stateCookie.nonce) {
      return this.buildGoogleFailureRedirect(returnTo, "google_state_mismatch");
    }

    if (callbackError) {
      return this.buildGoogleFailureRedirect(
        returnTo,
        callbackError === "access_denied"
          ? "google_access_denied"
          : "google_callback_failed",
      );
    }

    if (!authorizationCode) {
      return this.buildGoogleFailureRedirect(returnTo, "google_callback_failed");
    }

    try {
      const tokenResponse = await this.exchangeGoogleCodeForTokens(authorizationCode);

      if (!tokenResponse.id_token) {
        throw new UnauthorizedException("Google did not return an ID token");
      }

      const googleUser = await this.verifyGoogleIdToken(tokenResponse.id_token);
      const appUser = await this.findOrCreateGoogleUser(googleUser);

      await this.login(appUser, res);

      return new URL(returnTo, this.getFrontendOrigin()).toString();
    } catch (error) {
      console.error("Google authentication failed", error);
      return this.buildGoogleFailureRedirect(returnTo, "google_callback_failed");
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.access_token;

    if (token) {
      try {
        const auth = await this.jwtService.verifyAsync<AuthPayload>(token);
        const user = await this.usersService.findUser({ id: auth.sub });

        if (user) {
          if (user.isGuest) {
            await this.archiveGuestIdentity(user.id);
          } else {
            await this.usersService.updateUser({
              where: { id: auth.sub },
              data: { status: "offline" },
            });
          }
        }
      } catch {
        // Ignore invalid or expired cookies and still clear them.
      }
    }

    res.clearCookie("access_token", this.getAuthCookieOptions());
  }

  async getSessionUser(userId: number): Promise<SafeUser> {
    const user = await this.usersService.findUser({ id: userId });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.sanitizeUser(await this.ensureUserIsOnline(user));
  }

  private async getGoogleOidcConfiguration(): Promise<GoogleOidcConfiguration> {
    if (this.googleOidcConfiguration) {
      return this.googleOidcConfiguration;
    }

    const response = await fetch(GOOGLE_OPENID_CONFIGURATION_URL);

    if (!response.ok) {
      throw new UnauthorizedException("Unable to load Google OpenID configuration");
    }

    const configuration =
      (await response.json()) as Partial<GoogleOidcConfiguration>;

    if (
      typeof configuration.jwks_uri !== "string" ||
      typeof configuration.token_endpoint !== "string"
    ) {
      throw new UnauthorizedException("Invalid Google OpenID configuration");
    }

    this.googleOidcConfiguration = {
      jwks_uri: configuration.jwks_uri,
      token_endpoint: configuration.token_endpoint,
    };

    return this.googleOidcConfiguration;
  }

  private async getGoogleJwks(): Promise<GoogleJwk[]> {
    if (this.googleJwksCache && Date.now() < this.googleJwksCache.expiresAt) {
      return this.googleJwksCache.keys;
    }

    const configuration = await this.getGoogleOidcConfiguration();
    const response = await fetch(configuration.jwks_uri);

    if (!response.ok) {
      throw new UnauthorizedException("Unable to load Google signing keys");
    }

    const cacheControl = response.headers.get("cache-control") || "";
    const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
    const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
    const payload = (await response.json()) as { keys?: GoogleJwk[] };

    if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
      throw new UnauthorizedException("Google signing keys are unavailable");
    }

    this.googleJwksCache = {
      expiresAt: Date.now() + maxAgeMs,
      keys: payload.keys,
    };

    return payload.keys;
  }

  private decodeBase64Url(value: string): Buffer {
    return Buffer.from(value, "base64url");
  }

  private parseGoogleJwtSegment<T>(segment: string): T {
    return JSON.parse(this.decodeBase64Url(segment).toString("utf-8")) as T;
  }

  private isGoogleEmailVerified(value: boolean | string | undefined): boolean {
    return value === true || value === "true";
  }

  private async exchangeGoogleCodeForTokens(
    authorizationCode: string,
  ): Promise<GoogleTokenResponse> {
    const googleConfig = this.getGoogleConfig();
    const configuration = await this.getGoogleOidcConfiguration();
    const tokenBody = new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
      redirect_uri: googleConfig.redirectUri,
    });
    const response = await fetch(configuration.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException("Google token exchange failed");
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async verifyGoogleIdToken(
    idToken: string,
  ): Promise<VerifiedGoogleIdTokenPayload> {
    const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException("Malformed Google ID token");
    }

    const header = this.parseGoogleJwtSegment<GoogleIdTokenHeader>(encodedHeader);

    if (header.alg !== "RS256" || !header.kid) {
      throw new UnauthorizedException("Unsupported Google ID token algorithm");
    }

    const jwks = await this.getGoogleJwks();
    const jwk = jwks.find((key) => key.kid === header.kid);

    if (!jwk) {
      throw new UnauthorizedException("Unknown Google signing key");
    }

    const publicKey = createPublicKey({
      key: jwk,
      format: "jwk",
    });
    const signature = this.decodeBase64Url(encodedSignature);
    const signedContent = Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf-8");
    const isSignatureValid = verify("RSA-SHA256", signedContent, publicKey, signature);
    const payload = this.parseGoogleJwtSegment<GoogleIdTokenPayload>(encodedPayload);
    const googleConfig = this.getGoogleConfig();
    const allowedAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (!isSignatureValid) {
      throw new UnauthorizedException("Invalid Google ID token signature");
    }

    if (!GOOGLE_ISSUERS.has(payload.iss)) {
      throw new UnauthorizedException("Unexpected Google token issuer");
    }

    if (!allowedAudiences.includes(googleConfig.clientId)) {
      throw new UnauthorizedException("Google token audience mismatch");
    }

    if (Date.now() >= payload.exp * 1000) {
      throw new UnauthorizedException("Google ID token has expired");
    }

    if (!payload.email || !this.isGoogleEmailVerified(payload.email_verified)) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    return {
      ...payload,
      email: payload.email,
    };
  }

  private normalizeUsernameCandidate(value: string): string {
    const asciiValue = value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const slicedValue = asciiValue.slice(0, 20);

    if (slicedValue.length >= 2) {
      return slicedValue;
    }

    return "player";
  }

  private async generateAvailableUsername(
    displayName: string | undefined,
    email: string,
  ): Promise<string> {
    const emailLocalPart = email.split("@")[0] || "player";
    const baseUsername = this.normalizeUsernameCandidate(displayName || emailLocalPart);

    for (let suffix = 0; suffix < 50; suffix += 1) {
      const candidate =
        suffix === 0 ? baseUsername : `${baseUsername}-${suffix + 1}`;
      const existingUser = await this.usersService.findUserByUsername(candidate);

      if (!existingUser) {
        return candidate;
      }
    }

    return `${baseUsername}-${randomBytes(3).toString("hex")}`;
  }

  private async findOrCreateGoogleUser(
    googleUser: VerifiedGoogleIdTokenPayload,
  ): Promise<User> {
    const existingGoogleUser = await this.usersService.findUser({
      googleId: googleUser.sub,
    });

    if (existingGoogleUser) {
      const nextEmail =
        existingGoogleUser.email === googleUser.email
          ? existingGoogleUser.email
          : googleUser.email;
      const emailOwner =
        nextEmail === existingGoogleUser.email
          ? null
          : await this.usersService.findUserByEmail(nextEmail);

      if (emailOwner && emailOwner.id !== existingGoogleUser.id) {
        throw new ConflictException("This Google email is already used by another account");
      }

      return this.usersService.updateUser({
        where: { id: existingGoogleUser.id },
        data: {
          avatar_url: googleUser.picture ?? existingGoogleUser.avatar_url,
          email: nextEmail,
          googleId: googleUser.sub,
        },
      });
    }

    const existingEmailUser = await this.usersService.findUserByEmail(googleUser.email);

    if (existingEmailUser) {
      return this.usersService.updateUser({
        where: { id: existingEmailUser.id },
        data: {
          avatar_url: googleUser.picture ?? existingEmailUser.avatar_url,
          googleId: googleUser.sub,
        },
      });
    }

    const generatedPassword = randomBytes(24).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const username = await this.generateAvailableUsername(
      googleUser.name,
      googleUser.email,
    );

    return this.usersService.createUser({
      avatar_url: googleUser.picture ?? null,
      createdAt: new Date(),
      email: googleUser.email,
      googleId: googleUser.sub,
      password: hashedPassword,
      username,
    });
  }

  private async archiveGuestIdentity(userId: number): Promise<void> {
    const archivedSuffix = randomBytes(6).toString("hex");

    await this.usersService.updateUser({
      where: { id: userId },
      data: {
        status: "offline",
        username: `guest-archived-${userId}-${archivedSuffix}`,
      },
    });
  }
}
