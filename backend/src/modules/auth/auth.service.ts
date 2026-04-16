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
import { randomBytes } from "crypto";
import { CookieOptions, Request, Response } from "express";
import { AuthPayload } from "./types/auth-payload.type";
import type { SafeUser } from "./types/safe-user.type";

@Injectable()
export class AuthService {
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
