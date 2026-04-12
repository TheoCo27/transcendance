import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { ScoresService } from "@/modules/scores/scores.service";
import { ConflictException, Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { RoomTimerRuntime } from "../realtime.types";
import { broadcastRoomList, getQuestionIdForTurn, roomChannel } from "./realtime-runtime-utils";
import { RealtimeResponseService } from "./realtime-response.service";

@Injectable()
export class RealtimeGameRuntimeService {
  private readonly activeTimers = new Map<number, RoomTimerRuntime>();
  private readonly timerTickMs = 1000;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
    private readonly scoresService: ScoresService,
    private readonly response: RealtimeResponseService,
  ) {}

  stopAllTimers(): void {
    for (const roomId of this.activeTimers.keys()) this.stopRoomTimer(roomId);
  }

  ensureActiveQuestion(roomId: number, questionId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) throw new ConflictException("No active question timer");
    if (runtime.questionId !== questionId) {
      throw new ConflictException("Question is not active");
    }
  }

  async startGameLoop(roomId: number, server: Server): Promise<void> {
    const room = this.roomsService.getById(roomId);
    const questionDurationMs = room.questionDurationMs;
    const state = await this.gameService.startGame(roomId, questionDurationMs);
    const totalQuestions = Math.max(1, state.totalQuestions);

    server.to(roomChannel(roomId)).emit(
      "game:started",
      this.response.ok({ roomId, totalQuestions, questionDurationMs }),
    );
    this.startQuestionTimer(roomId, 1, totalQuestions, questionDurationMs, server);
  }

  completeActiveQuestion(roomId: number, reason: "timeout" | "all_answered", server: Server): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      return;
    }

    this.stopRoomTimer(roomId);
    const state = this.gameService.completeCurrentQuestion(roomId);
    const channel = roomChannel(roomId);

    if (reason === "timeout") {
      server.to(channel).emit(
        "game:question:timeout",
        this.response.ok({
          roomId: runtime.roomId,
          questionId: runtime.questionId,
          questionNumber: runtime.questionNumber,
          totalQuestions: runtime.totalQuestions,
        }),
      );
    }

    server.to(channel).emit("game:state", this.response.ok(state));

    if (runtime.questionNumber >= runtime.totalQuestions) {
      this.endGame(roomId, reason === "timeout" ? "timer_completed" : "all_answered", server);
      return;
    }

    const room = this.roomsService.getById(roomId);
    const questionDurationMs = room.questionDurationMs;
    this.startQuestionTimer(
      roomId,
      runtime.questionNumber + 1,
      runtime.totalQuestions,
      questionDurationMs,
      server,
    );
  }

  closeRoom(
    roomId: number,
    reason: string,
    server: Server,
  ): { roomId: number; reason: string } {
    const channel = roomChannel(roomId);
    const room = this.roomsService.getById(roomId);
    if (room.status === "playing") this.endGame(roomId, reason, server);

    const closed = this.roomsService.close(roomId);
    this.gameService.clearRoomState(roomId);
    this.stopRoomTimer(roomId);

    const payload = { ...closed, reason };
    server.to(channel).emit("room:closed", this.response.ok(payload));
    broadcastRoomList(server, this.roomsService, this.response);
    return payload;
  }

  private startQuestionTimer(
    roomId: number,
    questionNumber: number,
    totalQuestions: number,
    questionDurationMs: number | null,
    server: Server,
  ): void {
    this.stopRoomTimer(roomId);

    const questionId = getQuestionIdForTurn(this.gameService, roomId, questionNumber);
    const startsAtMs = Date.now();
    const endsAtMs =
      typeof questionDurationMs === "number" ? startsAtMs + questionDurationMs : null;
    const question = this.gameService.getPublicQuestion(roomId, questionId);
    const channel = roomChannel(roomId);
    const startsAt = new Date(startsAtMs).toISOString();
    const endsAt = endsAtMs ? new Date(endsAtMs).toISOString() : null;

    this.activeTimers.set(roomId, {
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      endsAtMs,
      tickInterval:
        typeof questionDurationMs === "number"
          ? setInterval(() => {
              this.emitTimerTick(roomId, questionId, questionNumber, totalQuestions, server);
            }, this.timerTickMs)
          : null,
      endTimeout:
        typeof questionDurationMs === "number"
          ? setTimeout(() => {
              this.completeActiveQuestion(roomId, "timeout", server);
            }, questionDurationMs)
          : null,
    });

    const state = this.gameService.startQuestion({
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      questionDurationMs,
      startsAt,
      endsAt,
    });

    server.to(channel).emit(
      "game:question:started",
      this.response.ok({
        roomId,
        questionId,
        question,
        questionNumber,
        totalQuestions,
        durationMs: questionDurationMs,
        startsAt,
        endsAt,
      }),
    );
    server.to(channel).emit("game:state", this.response.ok(state));

    if (typeof questionDurationMs === "number") {
      this.emitTimerTick(roomId, questionId, questionNumber, totalQuestions, server);
    }
  }

  private emitTimerTick(
    roomId: number,
    questionId: number,
    questionNumber: number,
    totalQuestions: number,
    server: Server,
  ): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime || runtime.endsAtMs === null) return;

    const remainingMs = Math.max(0, runtime.endsAtMs - Date.now());
    server.to(roomChannel(roomId)).emit(
      "game:timer",
      this.response.ok({
        roomId,
        questionId,
        questionNumber,
        totalQuestions,
        remainingMs,
        endsAt: new Date(runtime.endsAtMs).toISOString(),
      }),
    );
  }

  private endGame(roomId: number, reason: string, server: Server): void {
    this.stopRoomTimer(roomId);
    const leaderboard = this.gameService.getRoomLeaderboard(roomId);
    const winnerUserId = leaderboard.length > 0 ? leaderboard[0].userId : null;
    const currentRoom = this.roomsService.getById(roomId);
    const room = this.roomsService.finish(roomId);
    const gameState = this.gameService.finishGame(roomId);
    const channel = roomChannel(roomId);

    void this.scoresService.recordGameResult(
      leaderboard,
      winnerUserId,
      currentRoom.quizId,
    );

    server.to(channel).emit("room:state", this.response.ok(room));
    server.to(channel).emit("game:leaderboard", this.response.ok(leaderboard));
    server.to(channel).emit("game:state", this.response.ok(gameState));
    server.to(channel).emit(
      "game:ended",
      this.response.ok({ roomId, reason, winnerUserId, leaderboard }),
    );

    broadcastRoomList(server, this.roomsService, this.response);
  }

  private stopRoomTimer(roomId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) return;

    if (runtime.tickInterval) {
      clearInterval(runtime.tickInterval);
    }
    if (runtime.endTimeout) {
      clearTimeout(runtime.endTimeout);
    }
    this.activeTimers.delete(roomId);
  }
}
