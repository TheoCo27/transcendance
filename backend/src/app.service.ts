import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";

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
export class AppService implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    this.pool = databaseUrl
      ? new Pool({
          connectionString: databaseUrl,
        })
      : null;
  }

  async getHealth(): Promise<HealthStatus> {
    const status: HealthStatus = {
      service: "backend",
      framework: "nestjs",
      ok: true,
      timestamp: new Date().toISOString(),
      database: {
        configured: Boolean(this.pool),
        ok: false,
      },
    };

    if (!this.pool) {
      return status;
    }

    try {
      await this.pool.query("SELECT 1");
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
      message: "Backend NestJS accessible.",
      endpoints: ["/health", "/api"],
    };
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
