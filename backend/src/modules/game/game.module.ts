// Ce fichier declare le module de jeu et ses dependances sur
// les rooms et les quiz.
import { QuizzesModule } from "@/modules/quizzes/quizzes.module";
import { RoomsModule } from "@/modules/rooms/rooms.module";
import { Module } from "@nestjs/common";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  imports: [RoomsModule, QuizzesModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
