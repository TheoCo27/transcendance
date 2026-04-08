import { GameModule } from "@/modules/game/game.module";
import { RoomsModule } from "@/modules/rooms/rooms.module";
import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeGameEventsService } from "./services/realtime-game-events.service";
import { RealtimeGameRuntimeService } from "./services/realtime-game-runtime.service";
import { RealtimeAuthService } from "./services/realtime-auth.service";
import { RealtimePresenceService } from "./services/realtime-presence.service";
import { RealtimeResponseService } from "./services/realtime-response.service";
import { RealtimeRoomEventsService } from "./services/realtime-room-events.service";
import { RealtimeValidationService } from "./services/realtime-validation.service";

@Module({
  imports: [RoomsModule, GameModule],
  providers: [
    RealtimeGateway,
    RealtimeAuthService,
    RealtimeResponseService,
    RealtimeValidationService,
    RealtimePresenceService,
    RealtimeGameRuntimeService,
    RealtimeGameEventsService,
    RealtimeRoomEventsService,
  ],
})
export class RealtimeModule {}
