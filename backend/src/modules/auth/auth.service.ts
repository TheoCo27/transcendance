import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import { UsersService } from "@/modules/users/users.service";
import { Prisma, User } from "@generated/prisma/client";
import {
  BadGatewayException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { CookieOptions, Request, Response } from "express";
import { AuthPayload } from "./types/auth-payload.type";
import type { SafeUser } from "./types/safe-user.type";

type GoogleTokenResponse = {
  access_token: string;
};

type GoogleUserInfoResponse = {
  sub: string;
  email?: string;
  name?: string;
};

@Injectable()
export class AuthService {
  private static readonly OAUTH_GOOGLE_STATE_COOKIE = "oauth_google_state";
  private static readonly OAUTH_GOOGLE_AUTHORIZE_URL =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private static readonly OAUTH_GOOGLE_TOKEN_URL =
    "https://oauth2.googleapis.com/token";
  private static readonly OAUTH_GOOGLE_USERINFO_URL =
    "https://openidconnect.googleapis.com/v1/userinfo";

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return user;
  }

  private sanitizeUser(user: User): SafeUser {
    const { password, ...safeUser } = user;
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

  private getOAuthGoogleStateCookieOptions(): CookieOptions {
    return {
      ...this.getAuthCookieOptions(),
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    };
  }

  private getOauthGoogleConfig(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string;
  } {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const scope = process.env.GOOGLE_SCOPE || "openid email profile";

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException("Google OAuth is not configured");
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      scope,
    };
  }

  getOauthGoogleStartUrl(res: Response): string {
    const config = this.getOauthGoogleConfig();
    const state = randomUUID();
    const authorizeUrl = new URL(AuthService.OAUTH_GOOGLE_AUTHORIZE_URL);

    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", config.scope);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("access_type", "offline");
    authorizeUrl.searchParams.set("prompt", "consent");

    res.cookie(
      AuthService.OAUTH_GOOGLE_STATE_COOKIE,
      state,
      this.getOAuthGoogleStateCookieOptions(),
    );

    return authorizeUrl.toString();
  }

  clearOauthGoogleState(res: Response): void {
    res.clearCookie(
      AuthService.OAUTH_GOOGLE_STATE_COOKIE,
      this.getOAuthGoogleStateCookieOptions(),
    );
  }

  async login(user: User, res: Response): Promise<SafeUser> {
    const updatedUser = await this.usersService.updateUser({
      where: { id: user.id },
      data: { status: "online" },
    });

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
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.usersService.createUser({
        ...dto,
        password: hashedPassword,
        createdAt: new Date(),
      });

      return this.login(user, res);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email already exists");
      }

      throw error;
    }
  }

  async guestLogin(res: Response): Promise<SafeUser> {
    const guestId = randomUUID();
    const user = await this.usersService.createUser({
      email: `guest+${guestId}@guest.local`,
      username: `Guest-${guestId.slice(0, 8)}`,
      password: await bcrypt.hash(randomUUID(), 10),
      createdAt: new Date(),
    });

    return this.login(user, res);
  }

  async loginWithGoogle(
    req: Request,
    res: Response,
    code: string,
    state: string,
  ): Promise<SafeUser> {
    const expectedState = req.cookies?.[AuthService.OAUTH_GOOGLE_STATE_COOKIE];

    if (!expectedState || expectedState !== state) {
      throw new UnauthorizedException("Invalid OAuth state");
    }

    const config = this.getOauthGoogleConfig();
    const tokenPayload = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    });

    const tokenResponse = await fetch(AuthService.OAUTH_GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenPayload.toString(),
    });

    if (!tokenResponse.ok) {
      throw new BadGatewayException(
        "Failed to exchange Google authorization code",
      );
    }

    const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenJson.access_token) {
      throw new BadGatewayException("Google token response is invalid");
    }

    const userInfoResponse = await fetch(AuthService.OAUTH_GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new BadGatewayException("Failed to fetch Google profile");
    }

    const profile = (await userInfoResponse.json()) as GoogleUserInfoResponse;

    if (!profile.sub) {
      throw new BadGatewayException("Google profile is invalid");
    }

    const email = profile.email || `google-${profile.sub}@oauth.local`;
    const username =
      profile.name?.trim().slice(0, 32) || `Google-${profile.sub.slice(0, 8)}`;
    let user = await this.usersService.findUserByEmail(email);

    if (!user) {
      user = await this.usersService.createUser({
        email,
        username,
        password: await bcrypt.hash(randomUUID(), 10),
        createdAt: new Date(),
      });
    }

    this.clearOauthGoogleState(res);
    return this.login(user, res);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.access_token;

    if (token) {
      try {
        const auth = await this.jwtService.verifyAsync<AuthPayload>(token);
        await this.usersService.updateUser({
          where: { id: auth.sub },
          data: { status: "offline" },
        });
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

    return this.sanitizeUser(user);
  }
}
