import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { ScoresService } from "@/modules/scores/scores.service";
import { ConflictException, Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { RoomTimerRuntime } from "../realtime.types";
import { RealtimeResponseService } from "./realtime-response.service";
import {
  broadcastRoomList,
  getQuestionIdForTurn,
  roomChannel,
} from "./realtime-runtime-utils";

@Injectable()
export class RealtimeGameRuntimeService {
  private readonly activeTimers = new Map<number, RoomTimerRuntime>();
  private readonly questionDurationMs = Number(
    process.env.GAME_QUESTION_DURATION_MS || 10000,
  );
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
    const totalQuestions = Math.max(1);
    await this.gameService.startGame(
      roomId,
      totalQuestions,
      this.questionDurationMs,
    );
    server.to(roomChannel(roomId)).emit(
      "game:started",
      this.response.ok({
        roomId,
        totalQuestions,
        questionDurationMs: this.questionDurationMs,
      }),
    );
    await this.startQuestionTimer(roomId, 1, totalQuestions, server);
  }

  async closeRoom(
    roomId: number,
    reason: string,
    server: Server,
  ): Promise<{ roomId: number; reason: string }> {
    const channel = roomChannel(roomId);
    const room = await this.roomsService.getById(roomId);
    if (room.status === "playing") {
      await this.endGame(roomId, reason, server);
    }

    const closed = await this.roomsService.close(roomId);
    this.gameService.clearRoomState(roomId);
    this.stopRoomTimer(roomId);

    const payload = { ...closed, reason };
    server.to(channel).emit("room:closed", this.response.ok(payload));
    await broadcastRoomList(server, this.roomsService, this.response);
    return payload;
  }

  private async startQuestionTimer(
    roomId: number,
    questionNumber: number,
    totalQuestions: number,
    server: Server,
  ): Promise<void> {
    this.stopRoomTimer(roomId);

    const questionId = getQuestionIdForTurn(this.gameService, questionNumber);
    const startsAtMs = Date.now();
    const endsAtMs = startsAtMs + this.questionDurationMs;
    const question = this.gameService.getPublicQuestion(questionId);
    const channel = roomChannel(roomId);
    const startsAt = new Date(startsAtMs).toISOString();
    const endsAt = new Date(endsAtMs).toISOString();

    this.activeTimers.set(roomId, {
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      endsAtMs,
      tickInterval: setInterval(() => {
        this.emitTimerTick(
          roomId,
          questionId,
          questionNumber,
          totalQuestions,
          server,
        );
      }, this.timerTickMs),
      endTimeout: setTimeout(() => {
        void this.onQuestionTimeout(roomId, server);
      }, this.questionDurationMs),
    });

    const state = await this.gameService.startQuestion({
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      questionDurationMs: this.questionDurationMs,
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
        durationMs: this.questionDurationMs,
        startsAt,
        endsAt,
      }),
    );
    server.to(channel).emit("game:state", this.response.ok(state));
    this.emitTimerTick(
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      server,
    );
  }

  private emitTimerTick(
    roomId: number,
    questionId: number,
    questionNumber: number,
    totalQuestions: number,
    server: Server,
  ): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) return;

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

  private async onQuestionTimeout(
    roomId: number,
    server: Server,
  ): Promise<void> {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) return;

    this.stopRoomTimer(roomId);
    const state = await this.gameService.markQuestionTimedOut(roomId);
    server.to(roomChannel(roomId)).emit(
      "game:question:timeout",
      this.response.ok({
        roomId: runtime.roomId,
        questionId: runtime.questionId,
        questionNumber: runtime.questionNumber,
        totalQuestions: runtime.totalQuestions,
      }),
    );
    server.to(roomChannel(roomId)).emit("game:state", this.response.ok(state));

    if (runtime.questionNumber >= runtime.totalQuestions) {
      await this.endGame(roomId, "timer_completed", server);
      return;
    }

    await this.startQuestionTimer(
      roomId,
      runtime.questionNumber + 1,
      runtime.totalQuestions,
      server,
    );
  }

  private async endGame(
    roomId: number,
    reason: string,
    server: Server,
  ): Promise<void> {
    this.stopRoomTimer(roomId);
    const leaderboard = await this.gameService.getRoomLeaderboard(roomId);
    const winnerUserId = leaderboard.length > 0 ? leaderboard[0].userId : null;
    const room = await this.roomsService.finish(roomId);
    const gameState = await this.gameService.finishGame(roomId);
    const channel = roomChannel(roomId);

    this.scoresService.recordGameResult(leaderboard, winnerUserId);

    server.to(channel).emit("room:state", this.response.ok(room));
    server.to(channel).emit("game:leaderboard", this.response.ok(leaderboard));
    server.to(channel).emit("game:state", this.response.ok(gameState));
    server
      .to(channel)
      .emit(
        "game:ended",
        this.response.ok({ roomId, reason, winnerUserId, leaderboard }),
      );

    await broadcastRoomList(server, this.roomsService, this.response);
  }

  private stopRoomTimer(roomId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) return;

    clearInterval(runtime.tickInterval);
    clearTimeout(runtime.endTimeout);
    this.activeTimers.delete(roomId);
  }
}
