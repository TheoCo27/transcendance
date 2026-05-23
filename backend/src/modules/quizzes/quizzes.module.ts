// Ce fichier declare le module de quiz et branche Prisma
// pour la persistence des quiz et questions.
import { PrismaModule } from "@/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesBootstrapService } from "./quizzes-bootstrap.service";
import { QuizzesService } from "./quizzes.service";

@Module({
  imports: [PrismaModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizzesBootstrapService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
