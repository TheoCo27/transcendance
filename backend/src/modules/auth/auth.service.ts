import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import { UsersService } from "@/modules/users/users.service";
import { Prisma, User } from "@generated/prisma/client";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Response } from "express";
import type { SafeUser } from "./types/safe-user.type";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException(); // 401 Unauthorized

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) throw new UnauthorizedException(); // 401 Unauthorized

    return user;
  }

  private sanitizeUser(user: User): SafeUser {
    // On extrait password de user et on met tout le reste dans safeUser
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async login(user: User, res: Response): Promise<{ success: boolean }> {
    const payload = { sub: user.id, username: user.name };

    const access_token = await this.jwtService.signAsync(payload);

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: true,
    });
    res.send("L'utilisateur a bien été authentifié!");

    // A verifier le type de return souhaite
    return { success: true };
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
      )
        throw new ConflictException("L'email est deja existant"); // 409 (ressource deja existante)

      throw error;
    }
  }
}
