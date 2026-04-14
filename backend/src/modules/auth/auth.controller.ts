import { ok, type ApiResponse } from "@/common/http/api-response";
import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
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
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.register(dto, res));
  }

  @Post("guest")
  async guest(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.guestLogin(res));
  }

  @Get("google/start")
  oauthGoogleStart(@Res() res: Response): void {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://localhost:3000";

    try {
      res.redirect(this.authService.getOauthGoogleStartUrl(res));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "oauth_google_not_configured";
      res.redirect(
        `${frontendOrigin}/login?oauth_error=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get("google/callback")
  async oauthGoogleCallback(
    @Req() req: Request,
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://localhost:3000";

    if (!code || !state) {
      this.authService.clearOauthGoogleState(res);
      res.redirect(`${frontendOrigin}/login?oauth_error=missing_code_or_state`);
      return;
    }

    try {
      await this.authService.loginWithGoogle(req, res, code, state);
      res.redirect(`${frontendOrigin}/`);
    } catch (error) {
      this.authService.clearOauthGoogleState(res);
      const message =
        error instanceof Error ? error.message : "oauth_google_failed";
      res.redirect(
        `${frontendOrigin}/login?oauth_error=${encodeURIComponent(message)}`,
      );
    }
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
