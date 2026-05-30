// Ce fichier contient les informations globales du backend:
// healthcheck applicatif et resume des capacites exposees par l'API.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

// Structure retournee par l'endpoint de sante du backend.
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

  // Retourne l'etat de sante du backend et de la base.
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

  // Expose un resume statique des capacites de l'API.
  getApi() {
    return {
      name: "ft_transcendence",
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
        "/scores/leaderboard",
        "/scores/users/:userId",
        "/scores/quizzes/:quizId/leaderboard",
        "/quizzes",
        "/quizzes/:id",
      ],
    };
  }
}
