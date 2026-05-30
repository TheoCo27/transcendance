// Ce fichier declare le module racine NestJS et assemble tous les modules
// fonctionnels du projet.
import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { QuizzesModule } from "./modules/quizzes/quizzes.module";
import { ScoresModule } from "./modules/scores/scores.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 30000,
      limit: 10,
    }]),
    AuthModule,
    UsersModule,
    PrismaModule,
    QuizzesModule,
    ScoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
