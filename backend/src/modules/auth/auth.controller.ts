import { ok, type ApiResponse } from "@/common/http/api-response";
import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthGuard } from "./guards/auth.guard";
import { AuthService } from "./auth.service";
import { AuthPayload } from "./types/auth-payload.type";
import { SafeUser } from "./types/safe-user.type";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<SafeUser>> {
    const user = await this.authService.validateUser(dto);
    return ok(await this.authService.login(user, res));
  }

  @Post("register")
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.register(dto));
  }

  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<{ loggedOut: true }>> {
    await this.authService.logout(req, res);
    return ok({ loggedOut: true });
  }

  @Get("session")
  @UseGuards(AuthGuard)
  async session(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.getSessionUser(auth.sub));
  }
}
