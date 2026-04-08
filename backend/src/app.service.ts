import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

type HealthStatus = {
  service: "backend";
  framework: "nestjs";
  ok: boolean;
  timestamp: string;
  database: {
    configured: boolean;
    ok: boolean;
    error?: string;
  };
};

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealth(): Promise<HealthStatus> {
    const status: HealthStatus = {
      service: "backend",
      framework: "nestjs",
      ok: true,
      timestamp: new Date().toISOString(),
      database: {
        configured: this.prismaService.isConfigured,
        ok: false,
      },
    };

    if (!this.prismaService.isConfigured) {
      return status;
    }

    try {
      await this.prismaService.ping();
      status.database.ok = true;
      return status;
    } catch (error) {
      status.ok = false;
      status.database.error =
        error instanceof Error ? error.message : "Unknown database error";
      return status;
    }
  }

  getApi() {
    return {
      name: "ft_transcendance starter",
      framework: "nestjs",
      language: "typescript",
      orm: "prisma",
      message: "Backend NestJS accessible.",
      endpoints: [
        "/health",
        "/api",
        "/auth/register",
        "/auth/login",
        "/auth/logout",
        "/auth/session",
        "/users/me",
        "/users/:id",
        "/rooms",
        "/rooms/:roomId",
        "/rooms/:roomId/join",
        "/game/:roomId/state",
        "/game/answer",
        "/scores/leaderboard",
        "/scores/users/:userId",
      ],
      realtime: {
        namespace: "/ws",
        inboundEvents: [
          "room:list",
          "room:create",
          "room:join",
          "room:leave",
          "room:start",
          "game:answer",
          "chat:message",
        ],
        outboundEvents: [
          "ws:connected",
          "room:list",
          "room:list-updated",
          "room:created",
          "room:joined",
          "room:left",
          "room:state",
          "room:started",
          "room:closed",
          "game:started",
          "game:question:started",
          "game:timer",
          "game:question:timeout",
          "game:state",
          "game:answer:result",
          "game:leaderboard",
          "game:ended",
          "chat:message",
          "room:create:error",
          "room:join:error",
          "room:leave:error",
          "room:start:error",
          "game:answer:error",
          "chat:message:error",
        ],
      },
    };
  }
}
