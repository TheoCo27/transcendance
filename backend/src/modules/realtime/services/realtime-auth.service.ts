import { AuthPayload } from "@/modules/auth/types/auth-payload.type";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

@Injectable()
export class RealtimeAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async authenticateSocket(client: Socket): Promise<number> {
    const token = this.extractAccessToken(client);
    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    const payload = await this.jwtService.verifyAsync<AuthPayload>(token);
    if (typeof payload.sub !== "number" || payload.sub < 1) {
      throw new UnauthorizedException("Invalid session payload");
    }

    return payload.sub;
  }

  private extractAccessToken(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const tokenCookie = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("access_token="));

    if (!tokenCookie) {
      return null;
    }

    const rawValue = tokenCookie.slice("access_token=".length);
    const value = rawValue.trim();
    return value.length > 0 ? decodeURIComponent(value) : null;
  }
}

