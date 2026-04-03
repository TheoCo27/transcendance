import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import { Body, Controller, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { SafeUser } from "./types/safe-user.type";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const user = await this.authService.validateUser(dto);
    return await this.authService.login(user, res);
  }

  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<SafeUser> {
    const user = await this.authService.register(dto);
    return user;
  }

  @Post("logout")
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    return await this.authService.logout(res);
  }
}
