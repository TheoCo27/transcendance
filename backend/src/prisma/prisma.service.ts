import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prismaClient: PrismaClient | null;
  readonly isConfigured: boolean;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    this.isConfigured = Boolean(connectionString);
    this.prismaClient = connectionString
      ? new PrismaClient({
          adapter: new PrismaPg({
            connectionString,
          }),
        })
      : null;
  }

  get client(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error("DATABASE_URL is not configured");
    }

    return this.prismaClient;
  }

  async ping() {
    await this.client.$queryRaw`SELECT 1`;
  }

  async onModuleInit() {
    if (this.prismaClient) {
      await this.prismaClient.$connect();
    }
  }

  async onModuleDestroy() {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
    }
  }
}
