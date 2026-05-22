// Ce fichier assemble toute la couche temps reel du projet:
// gateway WS, auth WS, presence, rooms, runtime de jeu et validation.
import { GameModule } from "@/modules/game/game.module";
import { RoomsModule } from "@/modules/rooms/rooms.module";
import { ScoresModule } from "@/modules/scores/scores.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeGameEventsService } from "./services/realtime-game-events.service";
import { RealtimeGameRuntimeService } from "./services/realtime-game-runtime.service";
import { RealtimeAuthService } from "./services/realtime-auth.service";
import { RealtimeBroadcastService } from "./services/realtime-broadcast.service";
import { RealtimePresenceService } from "./services/realtime-presence.service";
import { RealtimeResponseService } from "./services/realtime-response.service";
import { RealtimeRoomEventsService } from "./services/realtime-room-events.service";
import { RealtimeRateLimitService } from "./services/realtime-rate-limit.service";
import { RealtimeValidationService } from "./services/realtime-validation.service";

@Module({
  imports: [RoomsModule, GameModule, ScoresModule, UsersModule],
  providers: [
    RealtimeGateway,
    RealtimeAuthService,
    RealtimeBroadcastService,
    RealtimeResponseService,
    RealtimeValidationService,
    RealtimePresenceService,
    RealtimeGameRuntimeService,
    RealtimeGameEventsService,
    RealtimeRoomEventsService,
    RealtimeRateLimitService,
  ],
  exports: [RealtimeBroadcastService],
})
export class RealtimeModule {}
