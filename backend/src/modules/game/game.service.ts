// Ce fichier contient le moteur metier du jeu quiz:
// etat runtime, questions actives, reponses et leaderboard.
import { QuizzesService } from "@/modules/quizzes/quizzes.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { pickWordleWord } from "./wordle-word-bank";
import { WordlePlayerState, WordleState } from "./types/wordle.types";

export type GameLeaderboardEntry = {
  userId: number;
  score: number;
};

export type GameState = {
  roomId: number;
  status: "waiting" | "playing" | "finished";
  currentQuestionId: number | null;
  currentQuestionNumber: number;
  totalQuestions: number;
  questionDurationMs: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  answersForCurrentQuestion: number;
  totalAnswers: number;
  leaderboard: GameLeaderboardEntry[];
  winnerUserId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  wordle: WordleState | null;
  updatedAt: string;
};

export type SubmitAnswerResult = {
  roomId: number;
  userId: number;
  questionId: number;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  scoreDelta: number;
  userTotalScore: number;
  totalAnswers: number;
};

export type PublicQuestion = {
  id: number;
  text: string;
  options: string[];
};

type RoomRuntime = {
  answeredByQuestion: Map<number, Set<number>>;
  scoresByUser: Map<number, number>;
  scoresAtGameStart: Map<number, number>;
  totalAnswers: number;
  wordle: {
    sharedWord: string | null;
    playerStates: Map<number, WordlePlayerState>;
  };
};

type QuestionEntry = PublicQuestion & {
  correctAnswerIndex: number;
  points: number;
};

type RoomQuestionBank = {
  sourceQuizId: number | null;
  questions: QuestionEntry[];
};

@Injectable()
export class GameService {
  private readonly roomStates = new Map<number, GameState>();
  private readonly roomRuntime = new Map<number, RoomRuntime>();
  private readonly roomQuestions = new Map<number, RoomQuestionBank>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly quizzesService: QuizzesService,
  ) { }

  // Retourne l'etat courant de la partie pour une room.
  async getRoomState(roomId: number): Promise<GameState> {
    const room = await this.roomsService.getById(roomId);
    const runtime = this.getRoomRuntime(roomId);
    const playerIds = room.players.map((player) => player.userId);

    if (room.gameType === "quiz") {
      await this.ensureRoomQuestions(roomId, room.quizId);
    }

    this.syncScoresWithPlayers(playerIds, runtime);
    this.syncWordlePlayers(playerIds, runtime);
    const wordleState =
      room.gameType === "wordle"
        ? this.buildWordleState(runtime, playerIds)
        : null;

    const existing = this.roomStates.get(roomId);
    if (existing) {
      // Keep last finished game result visible even if the room has been reset
      // to waiting, until a new game actually starts.
      if (existing.status === "finished" && room.status === "waiting") {
        existing.totalQuestions = Math.max(existing.totalQuestions, 1);
        existing.startedAt = existing.startedAt ?? room.startedAt;
        existing.endedAt = existing.endedAt ?? room.finishedAt;
        existing.leaderboard = this.buildLeaderboard(runtime);
        existing.winnerUserId = existing.leaderboard[0]?.userId ?? null;
        existing.wordle = wordleState;
        return existing;
      }

      existing.status = room.status;
      existing.totalQuestions = Math.max(existing.totalQuestions, 1);
      existing.startedAt = room.startedAt ?? existing.startedAt;
      existing.endedAt = room.finishedAt ?? existing.endedAt;
      existing.leaderboard =
        existing.status === "finished"
          ? this.buildLeaderboard(runtime)
          : this.buildFrozenLeaderboard(runtime);
      existing.wordle = wordleState;
      if (existing.status === "finished" && existing.winnerUserId === null) {
        existing.winnerUserId = existing.leaderboard[0]?.userId ?? null;
      }
      if (existing.status !== "finished") {
        existing.winnerUserId = null;
      }
      return existing;
    }

    const leaderboard =
      room.status === "finished"
        ? this.buildLeaderboard(runtime)
        : this.buildFrozenLeaderboard(runtime);
    const state: GameState = {
      roomId,
      status: room.status,
      currentQuestionId: null,
      currentQuestionNumber: 0,
      totalQuestions: 1,
      questionDurationMs: null,
      questionStartedAt: null,
      questionEndsAt: null,
      answersForCurrentQuestion: 0,
      totalAnswers: runtime.totalAnswers,
      leaderboard,
      winnerUserId:
        room.status === "finished" ? (leaderboard[0]?.userId ?? null) : null,
      startedAt: room.startedAt,
      endedAt: room.finishedAt,
      wordle: wordleState,
      updatedAt: new Date().toISOString(),
    };

    this.roomStates.set(roomId, state);
    return state;
  }

  // Initialise l'etat runtime d'une nouvelle partie.
  async startGame(
    roomId: number,
    totalQuestions: number,
    questionDurationMs: number,
  ): Promise<GameState> {
    const room = await this.roomsService.getById(roomId);
    const runtime = this.getRoomRuntime(roomId);
    const state = await this.getRoomState(roomId);
    const now = new Date().toISOString();

    runtime.answeredByQuestion.clear();
    runtime.totalAnswers = 0;
    this.syncScoresWithPlayers(
      room.players.map((player) => player.userId),
      runtime,
    );

    state.status = "playing";
    state.currentQuestionId = null;
    state.currentQuestionNumber = 0;
    state.totalQuestions = Math.max(1, totalQuestions);
    state.questionDurationMs = questionDurationMs;
    state.questionStartedAt = null;
    state.questionEndsAt = null;
    state.answersForCurrentQuestion = 0;
    state.totalAnswers = 0;
    runtime.scoresAtGameStart = new Map(runtime.scoresByUser);
    state.leaderboard = this.buildFrozenLeaderboard(runtime);
    state.winnerUserId = null;
    state.startedAt = room.startedAt ?? now;
    state.endedAt = null;
    state.updatedAt = now;

    return state;
  }

  // Initialise une manche Wordle partagee pour tous les joueurs de la room.
  async startWordleGame(roomId: number): Promise<GameState> {
    const room = await this.roomsService.getById(roomId);
    const runtime = this.getRoomRuntime(roomId);
    const state = await this.getRoomState(roomId);
    const { wordLength } = this.getWordleConfig(room.gameConfig);
    const playerIds = room.players.map((player) => player.userId);
    const now = new Date().toISOString();

    runtime.answeredByQuestion.clear();
    runtime.totalAnswers = 0;
    runtime.wordle.sharedWord = pickWordleWord(wordLength);
    runtime.wordle.playerStates = new Map(
      playerIds.map((userId) => [
        userId,
        {
          userId,
          finished: false,
          won: null,
          attemptsUsed: null,
          completedAt: null,
        } satisfies WordlePlayerState,
      ]),
    );
    this.syncScoresWithPlayers(playerIds, runtime);
    runtime.scoresAtGameStart = new Map(runtime.scoresByUser);

    state.status = "playing";
    state.currentQuestionId = null;
    state.currentQuestionNumber = 0;
    state.totalQuestions = 1;
    state.questionDurationMs = null;
    state.questionStartedAt = null;
    state.questionEndsAt = null;
    state.answersForCurrentQuestion = 0;
    state.totalAnswers = 0;
    state.leaderboard = this.buildFrozenLeaderboard(runtime);
    state.winnerUserId = null;
    state.startedAt = room.startedAt ?? now;
    state.endedAt = null;
    state.wordle = this.buildWordleState(runtime, playerIds);
    state.updatedAt = now;

    return state;
  }

  // Ouvre une question et met a jour l'etat visible.
  async startQuestion(params: {
    roomId: number;
    questionId: number;
    questionNumber: number;
    totalQuestions: number;
    questionDurationMs: number;
    startsAt: string;
    endsAt: string;
  }): Promise<GameState> {
    const state = await this.getRoomState(params.roomId);

    state.status = "playing";
    state.currentQuestionId = params.questionId;
    state.currentQuestionNumber = params.questionNumber;
    state.totalQuestions = params.totalQuestions;
    state.questionDurationMs = params.questionDurationMs;
    state.questionStartedAt = params.startsAt;
    state.questionEndsAt = params.endsAt;
    state.answersForCurrentQuestion = 0;
    state.updatedAt = params.startsAt;

    return state;
  }

  // Termine la question courante sans changer le score.
  async completeCurrentQuestion(roomId: number): Promise<GameState> {
    const state = await this.getRoomState(roomId);
    state.updatedAt = new Date().toISOString();
    return state;
  }

  // Marque la question courante comme terminee par timeout.
  async markQuestionTimedOut(roomId: number): Promise<GameState> {
    return this.completeCurrentQuestion(roomId);
  }

  // Enregistre la reponse d'un joueur sur la question active.
  async submitAnswer(dto: SubmitAnswerDto): Promise<SubmitAnswerResult> {
    const room = await this.roomsService.getById(dto.roomId);
    if (room.status !== "playing") {
      throw new ConflictException("Game is not running for this room");
    }

    if (!room.players.some((player) => player.userId === dto.userId)) {
      throw new UnauthorizedException("User is not in this room");
    }

    const state = await this.getRoomState(dto.roomId);
    if (
      state.currentQuestionId === null ||
      state.currentQuestionId !== dto.questionId
    ) {
      throw new ConflictException("Question is not active");
    }

    const runtime = this.getRoomRuntime(dto.roomId);
    const question = this.getQuestionEntry(dto.roomId, dto.questionId);
    if (dto.answerIndex >= question.options.length) {
      throw new BadRequestException("Answer index is out of range");
    }

    const answeredUsers =
      runtime.answeredByQuestion.get(dto.questionId) ?? new Set<number>();
    if (answeredUsers.has(dto.userId)) {
      throw new ConflictException("User already answered this question");
    }

    answeredUsers.add(dto.userId);
    runtime.answeredByQuestion.set(dto.questionId, answeredUsers);
    runtime.totalAnswers += 1;

    const isCorrect = question.correctAnswerIndex === dto.answerIndex;
    const scoreDelta = isCorrect ? question.points : 0;
    const previousScore = runtime.scoresByUser.get(dto.userId) ?? 0;
    const userTotalScore = previousScore + scoreDelta;
    runtime.scoresByUser.set(dto.userId, userTotalScore);

    state.answersForCurrentQuestion = answeredUsers.size;
    state.totalAnswers = runtime.totalAnswers;
    state.leaderboard = this.buildFrozenLeaderboard(runtime);
    state.updatedAt = new Date().toISOString();

    return {
      roomId: dto.roomId,
      userId: dto.userId,
      questionId: dto.questionId,
      selectedAnswerIndex: dto.answerIndex,
      isCorrect,
      scoreDelta,
      userTotalScore,
      totalAnswers: state.totalAnswers,
    };
  }

  // Finalise la partie et fixe le classement final.
  async finishGame(roomId: number): Promise<GameState> {
    const room = await this.roomsService.getById(roomId);
    const state = await this.getRoomState(roomId);
    const playerIds = room.players.map((player) => player.userId);

    state.status = "finished";
    state.leaderboard = this.buildLeaderboard(this.getRoomRuntime(roomId));
    state.winnerUserId = state.leaderboard[0]?.userId ?? null;
    state.endedAt = room.finishedAt ?? new Date().toISOString();
    state.wordle =
      room.gameType === "wordle"
        ? this.buildWordleState(this.getRoomRuntime(roomId), playerIds)
        : null;
    state.updatedAt = state.endedAt;

    return state;
  }

  // Termine une partie pour Wordle puis remet la room en attente d'une nouvelle manche.
  async finishRoomGame(roomId: number): Promise<GameState> {
    const room = await this.roomsService.getById(roomId);
    if (room.status === "finished") {
      return this.finishGame(roomId);
    }

    if (room.status !== "playing") {
      throw new ConflictException("La partie n'est pas en cours");
    }

    await this.roomsService.resetAfterGame(roomId);
    return this.finishGame(roomId);
  }

  // Ajoute des points au classement runtime d'une room.
  async addRoomScore(
    roomId: number,
    userId: number,
    scoreDelta: number,
  ): Promise<GameLeaderboardEntry[]> {
    if (scoreDelta === 0) {
      return this.buildLeaderboard(this.getRoomRuntime(roomId));
    }

    const runtime = this.getRoomRuntime(roomId);
    const nextScore = (runtime.scoresByUser.get(userId) ?? 0) + scoreDelta;
    runtime.scoresByUser.set(userId, nextScore);
    this.syncScoresWithPlayers(
      (await this.roomsService.getById(roomId)).players.map((player) => player.userId),
      runtime,
    );

    return this.buildLeaderboard(runtime);
  }

  // Associe un numero de tour a l'id de question correspondant.
  getQuestionIdForTurn(_roomId: number, turnNumber: number): number {
    const questionOrder = this.getRoomQuestionBank(_roomId).map(
      (question) => question.id,
    );

    if (questionOrder.length === 0) {
      throw new ConflictException("No questions configured");
    }

    return questionOrder[(turnNumber - 1) % questionOrder.length];
  }

  // Retourne la version publique d'une question.
  getPublicQuestion(_roomId: number, questionId: number): PublicQuestion {
    const question = this.getQuestionEntry(_roomId, questionId);

    return {
      id: question.id,
      text: question.text,
      options: [...question.options],
    };
  }

  // Retourne le classement courant de la room.
  async getRoomLeaderboard(roomId: number): Promise<GameLeaderboardEntry[]> {
    await this.getRoomState(roomId);
    return this.buildLeaderboard(this.getRoomRuntime(roomId));
  }

  // Retourne le nombre de questions disponibles pour la room.
  async getQuestionCount(roomId: number): Promise<number> {
    const room = await this.roomsService.getById(roomId);
    if (room.gameType !== "quiz") {
      return 0;
    }

    await this.ensureRoomQuestions(roomId, room.quizId);
    return this.getRoomQuestionBank(roomId).length;
  }

  // Verifie si tous les joueurs ont repondu a la question active.
  async hasEveryPlayerAnsweredCurrentQuestion(
    roomId: number,
  ): Promise<boolean> {
    const room = await this.roomsService.getById(roomId);
    const state = await this.getRoomState(roomId);
    if (state.currentQuestionId === null || room.players.length === 0) {
      return false;
    }

    const answeredUsers =
      this.getRoomRuntime(roomId).answeredByQuestion.get(
        state.currentQuestionId,
      ) ?? new Set<number>();

    return answeredUsers.size >= room.players.length;
  }

  // Enregistre la fin de partie d'un joueur Wordle sans terminer la room.
  async recordWordlePlayerFinish(params: {
    roomId: number;
    userId: number;
    won: boolean;
    attemptsUsed: number;
  }): Promise<{
    gameState: GameState;
    leaderboard: GameLeaderboardEntry[];
    allPlayersFinished: boolean;
  }> {
    const room = await this.roomsService.getById(params.roomId);
    if (room.gameType !== "wordle") {
      throw new ConflictException("Cette room n'utilise pas Wordle");
    }

    const { maxAttempts } = this.getWordleConfig(room.gameConfig);
    if (
      !Number.isInteger(params.attemptsUsed) ||
      params.attemptsUsed < 1 ||
      params.attemptsUsed > maxAttempts
    ) {
      throw new BadRequestException(
        "Le nombre de tentatives utilisees est invalide pour cette partie Wordle",
      );
    }

    const runtime = this.getRoomRuntime(params.roomId);
    const playerIds = room.players.map((player) => player.userId);
    this.syncScoresWithPlayers(playerIds, runtime);
    this.syncWordlePlayers(playerIds, runtime);

    const existingState = runtime.wordle.playerStates.get(params.userId);
    if (!existingState) {
      throw new UnauthorizedException("User is not in this room");
    }

    if (!runtime.wordle.sharedWord) {
      throw new ConflictException("La manche Wordle n'est pas initialisee");
    }

    if (!existingState.finished) {
      const completedAt = new Date().toISOString();
      runtime.wordle.playerStates.set(params.userId, {
        userId: params.userId,
        finished: true,
        won: params.won,
        attemptsUsed: params.attemptsUsed,
        completedAt,
      });

      const scoreDelta = params.won
        ? Math.max(1, maxAttempts - params.attemptsUsed + 1) * 100
        : 0;
      if (scoreDelta > 0) {
        runtime.scoresByUser.set(
          params.userId,
          (runtime.scoresByUser.get(params.userId) ?? 0) + scoreDelta,
        );
      }
    }

    const gameState = await this.getRoomState(params.roomId);
    gameState.updatedAt = new Date().toISOString();
    gameState.leaderboard = this.buildFrozenLeaderboard(runtime);
    gameState.wordle = this.buildWordleState(runtime, playerIds);

    return {
      gameState,
      leaderboard: this.buildLeaderboard(runtime),
      allPlayersFinished: this.haveAllWordlePlayersFinished(runtime, playerIds),
    };
  }

  // Verifie si tous les joueurs restants d'une room Wordle ont termine.
  async areAllWordlePlayersFinished(roomId: number): Promise<boolean> {
    const room = await this.roomsService.getById(roomId);
    if (room.gameType !== "wordle") {
      return false;
    }

    const runtime = this.getRoomRuntime(roomId);
    const playerIds = room.players.map((player) => player.userId);
    this.syncWordlePlayers(playerIds, runtime);
    return this.haveAllWordlePlayersFinished(runtime, playerIds);
  }

  // Vide tous les caches runtime d'une room.
  clearRoomState(roomId: number): void {
    this.roomStates.delete(roomId);
    this.roomRuntime.delete(roomId);
    this.roomQuestions.delete(roomId);
  }

  // Retourne ou initialise le runtime interne d'une room.
  private getRoomRuntime(roomId: number): RoomRuntime {
    const existing = this.roomRuntime.get(roomId);
    if (existing) {
      return existing;
    }

    const runtime: RoomRuntime = {
      answeredByQuestion: new Map<number, Set<number>>(),
      scoresByUser: new Map<number, number>(),
      scoresAtGameStart: new Map<number, number>(),
      totalAnswers: 0,
      wordle: {
        sharedWord: null,
        playerStates: new Map<number, WordlePlayerState>(),
      },
    };

    this.roomRuntime.set(roomId, runtime);
    return runtime;
  }

  // Construit le classement reel a partir des scores actuels.
  private buildLeaderboard(runtime: RoomRuntime): GameLeaderboardEntry[] {
    return [...runtime.scoresByUser.entries()]
      .map(([userId, score]) => ({ userId, score }))
      .sort(
        (left, right) => right.score - left.score || left.userId - right.userId,
      );
  }

  // Construit un classement masque sans reveler les scores.
  private buildMaskedLeaderboard(runtime: RoomRuntime): GameLeaderboardEntry[] {
    return [...runtime.scoresByUser.keys()]
      .sort((left, right) => left - right)
      .map((userId) => ({ userId, score: 0 }));
  }

  // Fige le classement visible sur les scores du debut de partie.
  private buildFrozenLeaderboard(runtime: RoomRuntime): GameLeaderboardEntry[] {
    const source =
      runtime.scoresAtGameStart.size > 0
        ? runtime.scoresAtGameStart
        : runtime.scoresByUser;

    return [...source.entries()]
      .map(([userId, score]) => ({ userId, score }))
      .sort(
        (left, right) => right.score - left.score || left.userId - right.userId,
      );
  }

  // Synchronise la map des scores avec les joueurs presents.
  private syncScoresWithPlayers(
    playerIds: number[],
    runtime: RoomRuntime,
  ): void {
    const playerIdSet = new Set(playerIds);

    for (const playerId of playerIds) {
      if (!runtime.scoresByUser.has(playerId)) {
        runtime.scoresByUser.set(playerId, 0);
      }
    }

    for (const userId of [...runtime.scoresByUser.keys()]) {
      if (!playerIdSet.has(userId)) {
        runtime.scoresByUser.delete(userId);
      }
    }
  }

  // Synchronise les etats Wordle avec les joueurs encore presents dans la room.
  private syncWordlePlayers(playerIds: number[], runtime: RoomRuntime): void {
    const playerIdSet = new Set(playerIds);

    for (const playerId of playerIds) {
      if (!runtime.wordle.playerStates.has(playerId)) {
        runtime.wordle.playerStates.set(playerId, {
          userId: playerId,
          finished: false,
          won: null,
          attemptsUsed: null,
          completedAt: null,
        });
      }
    }

    for (const userId of [...runtime.wordle.playerStates.keys()]) {
      if (!playerIdSet.has(userId)) {
        runtime.wordle.playerStates.delete(userId);
      }
    }
  }

  // Construit l'etat public Wordle visible par les clients.
  private buildWordleState(
    runtime: RoomRuntime,
    playerIds: number[],
  ): WordleState {
    const playerStates = playerIds
      .map(
        (userId) =>
          runtime.wordle.playerStates.get(userId) ?? {
            userId,
            finished: false,
            won: null,
            attemptsUsed: null,
            completedAt: null,
          },
      )
      .sort((left, right) => left.userId - right.userId);

    return {
      sharedWord: runtime.wordle.sharedWord,
      playersCompleted: playerStates.filter((player) => player.finished).length,
      totalPlayers: playerIds.length,
      playerStates,
    };
  }

  // Lit et valide la configuration Wordle de la room.
  private getWordleConfig(gameConfig: Record<string, unknown> | null): {
    wordLength: number;
    maxAttempts: number;
  } {
    if (!gameConfig) {
      throw new ConflictException("La configuration Wordle est absente");
    }

    const wordLength = gameConfig.wordLength;
    const maxAttempts = gameConfig.maxAttempts;

    if (
      typeof wordLength !== "number" ||
      !Number.isInteger(wordLength) ||
      wordLength < 5 ||
      wordLength > 7
    ) {
      throw new ConflictException(
        "La configuration de Wordle necessite un mot de longueur entre 5 et 7 caracteres",
      );
    }

    if (
      typeof maxAttempts !== "number" ||
      !Number.isInteger(maxAttempts) ||
      maxAttempts < 3 ||
      maxAttempts > 8
    ) {
      throw new ConflictException(
        "La configuration de Wordle necessite un nombre de tentatives entre 3 et 8",
      );
    }

    return { wordLength, maxAttempts };
  }

  // Indique si tous les joueurs actifs ont termine leur manche Wordle.
  private haveAllWordlePlayersFinished(
    runtime: RoomRuntime,
    playerIds: number[],
  ): boolean {
    if (playerIds.length === 0) {
      return false;
    }

    return playerIds.every(
      (userId) => runtime.wordle.playerStates.get(userId)?.finished === true,
    );
  }

  // Charge et met en cache les questions liees a la room.
  private async ensureRoomQuestions(
    roomId: number,
    quizId: number | null,
  ): Promise<void> {
    const cached = this.roomQuestions.get(roomId);
    if (
      cached &&
      cached.sourceQuizId === quizId &&
      cached.questions.length > 0
    ) {
      return;
    }

    if (typeof quizId === "number") {
      const quiz = await this.quizzesService.getQuizById(quizId);
      const quizQuestions = quiz.questions.map((question) => {
        const correctAnswerIndex = question.answers.findIndex(
          (answer) => answer === question.correctAnswer,
        );

        if (correctAnswerIndex < 0) {
          throw new ConflictException(
            `Question ${question.id} has an invalid correct answer`,
          );
        }

        return {
          id: question.id,
          text: question.questionText,
          options: [...question.answers],
          correctAnswerIndex,
          points: question.points,
        } satisfies QuestionEntry;
      });

      if (quizQuestions.length > 0) {
        this.roomQuestions.set(roomId, {
          sourceQuizId: quizId,
          questions: quizQuestions,
        });
        return;
      }
    }

    this.roomQuestions.set(roomId, {
      sourceQuizId: quizId,
      questions: [],
    });
  }

  // Retourne la banque de questions actuellement chargee.
  private getRoomQuestionBank(roomId: number): QuestionEntry[] {
    return this.roomQuestions.get(roomId)?.questions ?? [];
  }

  // Retourne une question precise ou leve une erreur.
  private getQuestionEntry(roomId: number, questionId: number): QuestionEntry {
    const question = this.getRoomQuestionBank(roomId).find(
      (entry) => entry.id === questionId,
    );
    if (!question) {
      throw new ConflictException(`Question ${questionId} not configured`);
    }

    return question;
  }
}
