// Ce fichier pilote le runtime temps reel d'une partie:
// timers, enchainement des questions et fin de partie.
import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { ScoresService } from "@/modules/scores/scores.service";
import { ConflictException, Injectable, Logger } from "@nestjs/common";
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
  private readonly wordleTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly logger = new Logger(RealtimeGameRuntimeService.name);
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

    for (const timeoutKey of this.wordleTimeouts.keys()) {
      this.clearWordleTimeout(timeoutKey);
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
      await this.refreshWordleTimeout(roomId, server);
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

  // Recalcule et programme les timeouts Wordle restants pour une room.
  async refreshWordleTimeout(roomId: number, server: Server): Promise<void> {
    this.clearWordleTimeoutsForRoom(roomId);

    const room = await this.roomsService.getById(roomId);
    if (room.status !== "playing" || room.gameType !== "wordle") {
      return;
    }

    const gameState = await this.gameService.getRoomState(roomId);
    const playerStates = gameState.wordle?.playerStates ?? [];
    const wordleConfig = (room.gameConfig ?? {}) as Record<string, unknown>;
    const maxAttempts = Math.max(1, this.getWordleMaxAttempts(wordleConfig));

    for (const playerState of playerStates) {
      if (playerState.finished) {
        continue;
      }

      const timePerWordSeconds = Math.max(1, Number(playerState.timePerWordSeconds) || 1);
      const currentGuess = Number.isFinite(playerState.currentGuess)
        ? Math.max(0, Math.trunc(playerState.currentGuess))
        : 0;

      const remainingTurnsRaw = maxAttempts - currentGuess;
      const timeoutKey = this.wordleTimeoutKey(roomId, playerState.userId);

      let delayMs: number;
      // If we have a turnStartedAt timestamp we can compute a more accurate remaining ms
      if (playerState.turnStartedAt) {
        const startedAtMs = Date.parse(playerState.turnStartedAt);
        if (Number.isFinite(startedAtMs)) {
          const elapsedMs = Math.max(0, Date.now() - startedAtMs);
          const expectedTotalMs = Math.max(0, remainingTurnsRaw) * timePerWordSeconds * 1000;
          delayMs = Math.max(0, expectedTotalMs - elapsedMs);
        } else {
          delayMs = Math.max(0, remainingTurnsRaw) * timePerWordSeconds * 1000;
        }
      } else {
        delayMs = Math.max(0, remainingTurnsRaw) * timePerWordSeconds * 1000;
      }

      // Log scheduling details for diagnostics
      this.logger.debug(
        `Scheduling wordle timeout for room=${roomId} user=${playerState.userId} currentGuess=${currentGuess} maxAttempts=${maxAttempts} remainingTurnsRaw=${remainingTurnsRaw} timePerWordSeconds=${timePerWordSeconds} delayMs=${delayMs}`,
      );

      // Ensure we don't schedule a negative or NaN timeout; use a small non-zero delay to re-evaluate
      if (!Number.isFinite(delayMs) || delayMs < 0) {
        delayMs = 1000;
      }

      this.wordleTimeouts.set(
        timeoutKey,
        setTimeout(() => {
          void this.handleWordleTimeout(roomId, playerState.userId, server);
        }, delayMs),
      );
    }
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
    this.clearWordleTimeoutsForRoom(roomId);
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

  // Nettoie le timeout Wordle associe a une room.
  private clearWordleTimeout(timeoutKey: string): void {
    const timeout = this.wordleTimeouts.get(timeoutKey);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.wordleTimeouts.delete(timeoutKey);
  }

  // Nettoie tous les timeouts Wordle associes a une room.
  private clearWordleTimeoutsForRoom(roomId: number): void {
    for (const timeoutKey of [...this.wordleTimeouts.keys()]) {
      if (timeoutKey.startsWith(`${roomId}:`)) {
        this.clearWordleTimeout(timeoutKey);
      }
    }
  }

  // Valide le timeout Wordle courant avant de terminer la room.
  private async handleWordleTimeout(
    roomId: number,
    userId: number,
    server: Server,
  ): Promise<void> {
    const timeoutKey = this.wordleTimeoutKey(roomId, userId);
    this.wordleTimeouts.delete(timeoutKey);

    const room = await this.roomsService.getById(roomId);
    if (room.status !== "playing" || room.gameType !== "wordle") {
      return;
    }

    const gameState = await this.gameService.getRoomState(roomId);
    const playerState = gameState.wordle?.playerStates.find(
      (entry) => entry.userId === userId,
    );

    if (!playerState || playerState.finished) {
      return;
    }

    // Sanity checks: ensure enough time has actually elapsed before finishing
    try {
      const timePerWordSeconds = Math.max(1, Number(playerState.timePerWordSeconds) || 1);
      const maxAttempts = Math.max(1, this.getWordleMaxAttempts((room.gameConfig ?? {}) as Record<string, unknown>));
      const currentGuess = Number.isFinite(playerState.currentGuess)
        ? Math.max(0, Math.trunc(playerState.currentGuess))
        : 0;
      const remainingTurnsRaw = Math.max(0, maxAttempts - currentGuess);

      let elapsedMs = 0;
      if (playerState.turnStartedAt) {
        const startedAtMs = Date.parse(playerState.turnStartedAt);
        if (Number.isFinite(startedAtMs)) {
          elapsedMs = Math.max(0, Date.now() - startedAtMs);
        }
      }

      const expectedTotalMs = remainingTurnsRaw * timePerWordSeconds * 1000;

      this.logger.debug(
        `Handling wordle timeout for room=${roomId} user=${userId} currentGuess=${currentGuess} maxAttempts=${maxAttempts} elapsedMs=${elapsedMs} expectedTotalMs=${expectedTotalMs}`,
      );

      const graceMs = 500; // small slack to avoid races
      if (expectedTotalMs - elapsedMs > graceMs) {
        // Not yet time to finish — reschedule properly and return.
        this.logger.warn(
          `Wordle timeout fired too early for room=${roomId} user=${userId}; rescheduling. (remainingMs=${expectedTotalMs - elapsedMs})`,
        );
        await this.refreshWordleTimeout(roomId, server);
        return;
      }

      await this.gameService.recordWordlePlayerFinish({
        roomId,
        userId,
        won: false,
        attemptsUsed: this.getWordleMaxAttempts(
          (room.gameConfig ?? {}) as Record<string, unknown>,
        ),
      });
    } catch (err) {
      this.logger.error(`Error while handling wordle timeout for room=${roomId} user=${userId}: ${err}`);
      // In error case, try to refresh timeouts so we don't leave the room in an inconsistent state
      await this.refreshWordleTimeout(roomId, server);
      return;
    }

    if (await this.completeWordleIfReady(roomId, server)) {
      return;
    }

    await this.refreshWordleTimeout(roomId, server);
  }

  // Genere une cle de timeout Wordle par joueur.
  private wordleTimeoutKey(roomId: number, userId: number): string {
    return `${roomId}:${userId}`;
  }

  // Lit le nombre maximum de tentatives Wordle depuis la configuration de room.
  private getWordleMaxAttempts(gameConfig: Record<string, unknown>): number {
    const rawValue = gameConfig.maxAttempts;

    if (typeof rawValue === "number" && Number.isInteger(rawValue) && rawValue > 0) {
      return rawValue;
    }

    return 6;
  }
}
