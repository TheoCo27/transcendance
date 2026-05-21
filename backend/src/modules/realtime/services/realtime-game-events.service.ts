// Ce fichier gere les evenements WebSocket lies aux reponses de jeu.
import { GameFinishEventDto } from "@/modules/realtime/dto/game-finish-event.dto";
import { SubmitAnswerDto } from "@/modules/game/dto/submit-answer.dto";
import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { ScoresService } from "@/modules/scores/scores.service";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RealtimeGameRuntimeService } from "./realtime-game-runtime.service";
import { RealtimePresenceService } from "./realtime-presence.service";
import { RealtimeResponseService } from "./realtime-response.service";
import { RealtimeValidationService } from "./realtime-validation.service";

@Injectable()
export class RealtimeGameEventsService {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
    private readonly scoresService: ScoresService,
    private readonly validation: RealtimeValidationService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
  ) {}

  // Gere la soumission d'une reponse pendant la partie.
  async handleGameAnswer(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(
      SubmitAnswerDto,
      rawPayload,
    );
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);

    const room = await this.roomsService.getById(payload.roomId);
    if (room.status !== "playing") {
      throw new ConflictException("Game is not running for this room");
    }
    if (!room.players.some((player) => player.userId === userId)) {
      throw new UnauthorizedException("User is not in this room");
    }

    this.gameRuntime.ensureActiveQuestion(payload.roomId, payload.questionId);

    const answer = await this.gameService.submitAnswer({ ...payload, userId });
    const gameState = await this.gameService.getRoomState(payload.roomId);
    const leaderboard = await this.gameService.getRoomLeaderboard(
      payload.roomId,
    );
    const channel = this.roomChannel(payload.roomId);

    server.to(channel).emit("game:answer:result", this.response.ok(answer));
    server.to(channel).emit("game:state", this.response.ok(gameState));
    server.to(channel).emit("game:leaderboard", this.response.ok(leaderboard));

    if (
      await this.gameService.hasEveryPlayerAnsweredCurrentQuestion(
        payload.roomId,
      )
    ) {
      await this.gameRuntime.completeActiveQuestion(
        payload.roomId,
        "all_answered",
        server,
      );
    }
  }

  // Termine une partie Wordle et diffuse son etat final.
  async handleGameFinish(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(
      GameFinishEventDto,
      rawPayload,
    );
    const userId = this.presence.resolveSocketUser(client.id);

    const room = await this.roomsService.getById(payload.roomId);
    if (!room.players.some((player) => player.userId === userId)) {
      throw new UnauthorizedException("User is not in this room");
    }

    if (room.status === "finished") {
      return;
    }

    const leaderboard = await this.gameService.addRoomScore(
      payload.roomId,
      userId,
      100,
    );
    const gameState = await this.gameService.finishRoomGame(payload.roomId);
    const updatedRoom = await this.roomsService.getById(payload.roomId);
    const channel = this.roomChannel(payload.roomId);

    await this.scoresService.recordGameResult(leaderboard, userId);

    gameState.leaderboard = leaderboard;
    gameState.winnerUserId = userId;

    server.to(channel).emit("room:state", this.response.ok(updatedRoom));
    server.to(channel).emit("game:leaderboard", this.response.ok(leaderboard));
    server.to(channel).emit("game:state", this.response.ok(gameState));
    server
      .to(channel)
      .emit(
        "game:ended",
        this.response.ok({
          roomId: payload.roomId,
          reason: "wordle_completed",
          winnerUserId: gameState.winnerUserId,
          leaderboard: gameState.leaderboard,
        }),
      );
  }

  // Genere le nom de canal Socket.IO d'une room.
  private roomChannel(roomId: number): string {
    return `room:${roomId}`;
  }
}
