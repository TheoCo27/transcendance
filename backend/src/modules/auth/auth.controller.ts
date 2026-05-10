// Ce fichier expose les endpoints HTTP d'authentification:
// login, register, guest, OAuth Google, logout et session courante.
import { ok, type ApiResponse } from "@/common/http/api-response";
import { LoginDto } from "@/modules/users/dto/login.dto";
import { RegisterDto } from "@/modules/users/dto/register.dto";
import { GuestLoginDto } from "@/modules/users/dto/guest-login.dto";
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

  // Authentifie un compte classique puis ouvre une session cookie JWT.
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<SafeUser>> {
    const user = await this.authService.validateUser(dto);
    return ok(await this.authService.login(user, res));
  }

  // Cree un compte classique puis ouvre directement la session.
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.register(dto, res));
  }

  // Cree une session invite pour entrer rapidement dans l'application.
  @Post("guest")
  async guestLogin(
    @Body() dto: GuestLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.loginAsGuest(dto, res));
  }

  // Redirige l'utilisateur vers l'ecran de consentement Google OAuth.
  @Get("google/start")
  startGoogleAuth(
    @Res() res: Response,
    @Query("returnTo") returnTo?: string,
  ): void {
    try {
      res.redirect(this.authService.buildGoogleAuthorizationUrl(res, returnTo));
    } catch {
      res.redirect(this.authService.buildGoogleFailureRedirect("/", "google_not_configured"));
    }
  }

  // Termine le flux OAuth Google puis redirige vers le frontend.
  @Get("google/callback")
  async handleGoogleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.redirect(await this.authService.handleGoogleCallback(req, res));
  }

  // Ferme la session courante et supprime le cookie d'acces.
  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<{ loggedOut: true }>> {
    await this.authService.logout(req, res);
    return ok({ loggedOut: true });
  }

  // Retourne l'utilisateur associe au cookie de session courant.
  @Get("session")
  @UseGuards(AuthGuard)
  async session(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(await this.authService.getSessionUser(auth.sub));
  }
}
