// Ce fichier pilote le runtime temps reel d'une partie:
// timers, enchainement des questions et fin de partie.
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
  ) { }

  // Arrete tous les timers de partie encore actifs.
  stopAllTimers(): void {
    for (const roomId of this.activeTimers.keys()) {
      this.stopRoomTimer(roomId);
    }
  }

  // Verifie qu'une question est bien active pour la room.
  ensureActiveQuestion(roomId: number, questionId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      throw new ConflictException("No active question timer");
    }
    if (runtime.questionId !== questionId) {
      throw new ConflictException("Question is not active");
    }
  }

  // Lance la boucle complete d'une partie pour une room.
  async startGameLoop(roomId: number, server: Server): Promise<void> {
    const room = await this.roomsService.getById(roomId);
    if (room.gameType === "wordle") {
      const gameState = await this.gameService.startWordleGame(roomId);

      server.to(roomChannel(roomId)).emit(
        "game:started",
        this.response.ok({
          roomId,
          totalQuestions: 1,
          questionDurationMs: null,
        }),
      );
      server
        .to(roomChannel(roomId))
        .emit("game:state", this.response.ok(gameState));
      return;
    }

    const totalQuestions =
      room.gameType === "quiz"
        ? Math.max(1, await this.gameService.getQuestionCount(roomId))
        : Math.max(1, room.rounds);
    const questionDurationMs =
      room.questionDurationMs ?? this.questionDurationMs;

    await this.gameService.startGame(
      roomId,
      totalQuestions,
      questionDurationMs,
    );
    server.to(roomChannel(roomId)).emit(
      "game:started",
      this.response.ok({
        roomId,
        totalQuestions,
        questionDurationMs,
      }),
    );
    await this.startQuestionTimer(
      roomId,
      1,
      totalQuestions,
      questionDurationMs,
      server,
    );
  }

  // Termine la question en cours puis enchaine la suite du jeu.
  async completeActiveQuestion(
    roomId: number,
    reason: "timeout" | "all_answered",
    server: Server,
  ): Promise<void> {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      return;
    }

    this.stopRoomTimer(roomId);
    const state =
      reason === "timeout"
        ? await this.gameService.markQuestionTimedOut(roomId)
        : await this.gameService.completeCurrentQuestion(roomId);
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
      await this.endGame(
        roomId,
        reason === "timeout" ? "timer_completed" : "all_answered",
        server,
      );
      return;
    }

    await this.startQuestionTimer(
      roomId,
      runtime.questionNumber + 1,
      runtime.totalQuestions,
      state.questionDurationMs ?? this.questionDurationMs,
      server,
    );
  }

  // Ferme une room et diffuse la raison de fermeture.
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

  // Termine une partie Wordle des que tous les joueurs encore presents ont fini.
  async completeWordleIfReady(
    roomId: number,
    server: Server,
  ): Promise<boolean> {
    const room = await this.roomsService.getById(roomId);
    if (room.status !== "playing" || room.gameType !== "wordle") {
      return false;
    }

    if (!(await this.gameService.areAllWordlePlayersFinished(roomId))) {
      return false;
    }

    await this.endGame(roomId, "wordle_completed", server);
    return true;
  }

  // Arrete immediatement tous les etats runtime associes a une room.
  disposeRoomRuntime(roomId: number): void {
    this.stopRoomTimer(roomId);
    this.gameService.clearRoomState(roomId);
  }

  // Demarre le timer et l'etat d'une nouvelle question.
  private async startQuestionTimer(
    roomId: number,
    questionNumber: number,
    totalQuestions: number,
    questionDurationMs: number,
    server: Server,
  ): Promise<void> {
    this.stopRoomTimer(roomId);

    const questionId = getQuestionIdForTurn(
      this.gameService,
      roomId,
      questionNumber,
    );
    const startsAtMs = Date.now();
    const endsAtMs = startsAtMs + questionDurationMs;
    const question = this.gameService.getPublicQuestion(roomId, questionId);
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
        void this.completeActiveQuestion(roomId, "timeout", server);
      }, questionDurationMs),
    });

    const state = await this.gameService.startQuestion({
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
    this.emitTimerTick(
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      server,
    );
  }

  // Diffuse le temps restant pour la question active.
  private emitTimerTick(
    roomId: number,
    questionId: number,
    questionNumber: number,
    totalQuestions: number,
    server: Server,
  ): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      return;
    }

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

  // Termine la partie, calcule le gagnant et publie le resultat.
  private async endGame(
    roomId: number,
    reason: string,
    server: Server,
  ): Promise<void> {
    this.stopRoomTimer(roomId);
    const leaderboard = await this.gameService.getRoomLeaderboard(roomId);
    const room = await this.roomsService.resetAfterGame(roomId);
    const gameState = await this.gameService.finishGame(roomId);
    const winnerUserId = gameState.winnerUserId;
    const channel = roomChannel(roomId);

    await this.scoresService.recordGameResult(
      leaderboard,
      winnerUserId,
      room.quizId,
    );

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

  // Nettoie le timer associe a une room.
  private stopRoomTimer(roomId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      return;
    }

    clearInterval(runtime.tickInterval);
    clearTimeout(runtime.endTimeout);
    this.activeTimers.delete(roomId);
  }
}
