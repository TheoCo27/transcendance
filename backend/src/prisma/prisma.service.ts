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

  // Donne acces au client Prisma en verifiant la configuration.
  get client(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error("DATABASE_URL is not configured");
    }

    return this.prismaClient;
  }

  // Verifie que la base repond a une requete simple.
  async ping() {
    await this.client.$queryRaw`SELECT 1`;
  }

  // Ouvre la connexion Prisma au demarrage du module.
  async onModuleInit() {
    if (this.prismaClient) {
      await this.prismaClient.$connect();
    }
  }

  // Ferme proprement la connexion Prisma a l'arret.
  async onModuleDestroy() {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
    }
  }
}
