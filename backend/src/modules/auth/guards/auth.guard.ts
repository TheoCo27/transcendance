import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { AuthPayload } from "../types/auth-payload.type";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired session");
    }
  }
}
