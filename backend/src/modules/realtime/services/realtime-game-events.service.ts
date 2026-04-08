import { SubmitAnswerDto } from "@/modules/game/dto/submit-answer.dto";
import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RealtimePresenceService } from "./realtime-presence.service";
import { RealtimeResponseService } from "./realtime-response.service";
import { RealtimeValidationService } from "./realtime-validation.service";
import { RealtimeGameRuntimeService } from "./realtime-game-runtime.service";

@Injectable()
export class RealtimeGameEventsService {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
    private readonly validation: RealtimeValidationService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
  ) {}

  handleGameAnswer(rawPayload: unknown, client: Socket, server: Server): void {
    const payload = this.validation.validatePayload(SubmitAnswerDto, rawPayload);
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);

    const room = this.roomsService.getById(payload.roomId);
    if (room.status !== "playing") {
      throw new ConflictException("Game is not running for this room");
    }
    if (!room.players.some((player) => player.userId === userId)) {
      throw new UnauthorizedException("User is not in this room");
    }

    this.gameRuntime.ensureActiveQuestion(payload.roomId, payload.questionId);

    const answer = this.gameService.submitAnswer({ ...payload, userId });
    const gameState = this.gameService.getRoomState(payload.roomId);
    const leaderboard = this.gameService.getRoomLeaderboard(payload.roomId);
    const channel = this.roomChannel(payload.roomId);

    server.to(channel).emit("game:answer:result", this.response.ok(answer));
    server.to(channel).emit("game:state", this.response.ok(gameState));
    server.to(channel).emit("game:leaderboard", this.response.ok(leaderboard));
  }

  private roomChannel(roomId: number): string {
    return `room:${roomId}`;
  }
}

