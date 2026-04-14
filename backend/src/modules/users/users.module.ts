import { PrismaModule } from "@/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { PrivateMessagesService } from "./private-messages.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, PrivateMessagesService, AuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
