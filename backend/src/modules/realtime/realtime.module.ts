import { GameModule } from "@/modules/game/game.module";
import { RoomsModule } from "@/modules/rooms/rooms.module";
import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";

@Module({
  imports: [RoomsModule, GameModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}

