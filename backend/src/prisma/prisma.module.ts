// Ce fichier declare le module NestJS qui rend Prisma injectable
// dans le reste de l'application.
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
