import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
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
import { CookieOptions, Response } from "express";
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

  async login(user: User, res: Response): Promise<SafeUser> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    res.cookie("access_token", accessToken, this.getAuthCookieOptions());

    return this.sanitizeUser(user);
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.usersService.createUser({
        ...dto,
        password: hashedPassword,
        createdAt: new Date(),
      });

      return this.sanitizeUser(user);
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

  async logout(res: Response): Promise<void> {
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
