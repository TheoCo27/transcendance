// Ce fichier declare le module utilisateur:
// profil, amis et messages prives.
import { PrismaModule } from "@/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { PrivateMessageRateLimitService } from "./private-message-rate-limit.service";
import { PrivateMessagesService } from "./private-messages.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    PrivateMessagesService,
    PrivateMessageRateLimitService,
    AuthGuard,
  ],
  exports: [UsersService],
})
export class UsersModule {}
