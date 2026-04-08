import { RoomsModule } from "@/modules/rooms/rooms.module";
import { Module } from "@nestjs/common";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  imports: [RoomsModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
