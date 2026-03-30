import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma/prisma.service";
import { UserService } from "./users/user.service";

@Module({
  controllers: [AppController],
  providers: [AppService, PrismaService, UserService],
})
export class AppModule {}
