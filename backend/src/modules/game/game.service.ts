import { RoomsService } from "@/modules/rooms/rooms.service";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";

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
  totalAnswers: number;
};

type QuestionEntry = PublicQuestion & {
  correctAnswerIndex: number;
};

@Injectable()
export class GameService {
  private readonly roomStates = new Map<number, GameState>();
  private readonly roomRuntime = new Map<number, RoomRuntime>();
  private readonly questionBank = new Map<number, QuestionEntry>([
    [
      101,
      {
        id: 101,
        text: "Quel est le language principal utilise pour ce backend ?",
        options: ["Python", "TypeScript", "Go", "Rust"],
        correctAnswerIndex: 1,
      },
    ],
    [
      102,
      {
        id: 102,
        text: "Quel endpoint est utilise pour rejoindre une room ?",
        options: ["/room/join", "/rooms/join", "/rooms/:roomId/join", "/join-room"],
        correctAnswerIndex: 2,
      },
    ],
    [
      103,
      {
        id: 103,
        text: "Quel event WebSocket diffuse le compte a rebours ?",
        options: ["game:start", "game:timer", "question:tick", "room:timer"],
        correctAnswerIndex: 1,
      },
    ],
  ]);

  constructor(private readonly roomsService: RoomsService) {}

  getRoomState(roomId: number): GameState {
    const room = this.roomsService.getById(roomId);
    const runtime = this.getRoomRuntime(roomId);
    this.syncScoresWithPlayers(room.players.map((player) => player.userId), runtime);

    const existing = this.roomStates.get(roomId);
    if (existing) {
      existing.status = room.status;
      existing.totalQuestions = Math.max(existing.totalQuestions, room.rounds);
      existing.startedAt = room.startedAt ?? existing.startedAt;
      existing.endedAt = room.finishedAt ?? existing.endedAt;
      existing.leaderboard = this.buildLeaderboard(runtime);
      if (existing.status === "finished" && existing.winnerUserId === null) {
        existing.winnerUserId = existing.leaderboard[0]?.userId ?? null;
      }
      return existing;
    }

    const leaderboard = this.buildLeaderboard(runtime);
    const state: GameState = {
      roomId,
      status: room.status,
      currentQuestionId: null,
      currentQuestionNumber: 0,
      totalQuestions: room.rounds,
      questionDurationMs: null,
      questionStartedAt: null,
      questionEndsAt: null,
      answersForCurrentQuestion: 0,
      totalAnswers: runtime.totalAnswers,
      leaderboard,
      winnerUserId: room.status === "finished" ? leaderboard[0]?.userId ?? null : null,
      startedAt: room.startedAt,
      endedAt: room.finishedAt,
      updatedAt: new Date().toISOString(),
    };

    this.roomStates.set(roomId, state);
    return state;
  }

  startGame(
    roomId: number,
    totalQuestions: number,
    questionDurationMs: number,
  ): GameState {
    const room = this.roomsService.getById(roomId);
    const runtime = this.getRoomRuntime(roomId);
    const state = this.getRoomState(roomId);
    const now = new Date().toISOString();

    runtime.answeredByQuestion.clear();
    runtime.scoresByUser.clear();
    runtime.totalAnswers = 0;
    this.syncScoresWithPlayers(room.players.map((player) => player.userId), runtime);

    state.status = "playing";
    state.currentQuestionId = null;
    state.currentQuestionNumber = 0;
    state.totalQuestions = Math.max(1, totalQuestions);
    state.questionDurationMs = questionDurationMs;
    state.questionStartedAt = null;
    state.questionEndsAt = null;
    state.answersForCurrentQuestion = 0;
    state.totalAnswers = 0;
    state.leaderboard = this.buildLeaderboard(runtime);
    state.winnerUserId = null;
    state.startedAt = room.startedAt ?? now;
    state.endedAt = null;
    state.updatedAt = now;

    return state;
  }

  startQuestion(params: {
    roomId: number;
    questionId: number;
    questionNumber: number;
    totalQuestions: number;
    questionDurationMs: number;
    startsAt: string;
    endsAt: string;
  }): GameState {
    const state = this.getRoomState(params.roomId);

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

  markQuestionTimedOut(roomId: number): GameState {
    const state = this.getRoomState(roomId);
    state.updatedAt = new Date().toISOString();
    return state;
  }

  submitAnswer(dto: SubmitAnswerDto): SubmitAnswerResult {
    const room = this.roomsService.getById(dto.roomId);
    if (room.status !== "playing") {
      throw new ConflictException("Game is not running for this room");
    }

    if (!room.players.some((player) => player.userId === dto.userId)) {
      throw new UnauthorizedException("User is not in this room");
    }

    const state = this.getRoomState(dto.roomId);
    if (state.currentQuestionId === null || state.currentQuestionId !== dto.questionId) {
      throw new ConflictException("Question is not active");
    }

    const runtime = this.getRoomRuntime(dto.roomId);
    const question = this.getQuestionEntry(dto.questionId);
    if (dto.answerIndex >= question.options.length) {
      throw new BadRequestException("Answer index is out of range");
    }

    const answeredUsers =
      runtime.answeredByQuestion.get(dto.questionId) || new Set<number>();
    if (answeredUsers.has(dto.userId)) {
      throw new ConflictException("User already answered this question");
    }

    answeredUsers.add(dto.userId);
    runtime.answeredByQuestion.set(dto.questionId, answeredUsers);
    runtime.totalAnswers += 1;

    const isCorrect = question.correctAnswerIndex === dto.answerIndex;
    const scoreDelta = isCorrect ? 100 : 0;
    const previousScore = runtime.scoresByUser.get(dto.userId) || 0;
    const userTotalScore = previousScore + scoreDelta;
    runtime.scoresByUser.set(dto.userId, userTotalScore);

    state.answersForCurrentQuestion = answeredUsers.size;
    state.totalAnswers = runtime.totalAnswers;
    state.leaderboard = this.buildLeaderboard(runtime);
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

  finishGame(roomId: number): GameState {
    const room = this.roomsService.getById(roomId);
    const state = this.getRoomState(roomId);

    state.status = "finished";
    state.leaderboard = this.buildLeaderboard(this.getRoomRuntime(roomId));
    state.winnerUserId = state.leaderboard[0]?.userId ?? null;
    state.endedAt = room.finishedAt ?? new Date().toISOString();
    state.updatedAt = state.endedAt;

    return state;
  }

  getQuestionOrder(): number[] {
    return [...this.questionBank.keys()].sort((a, b) => a - b);
  }

  getPublicQuestion(questionId: number): PublicQuestion {
    const question = this.getQuestionEntry(questionId);

    return {
      id: question.id,
      text: question.text,
      options: [...question.options],
    };
  }

  getRoomLeaderboard(roomId: number): GameLeaderboardEntry[] {
    this.getRoomState(roomId);
    return this.buildLeaderboard(this.getRoomRuntime(roomId));
  }

  clearRoomState(roomId: number): void {
    this.roomStates.delete(roomId);
    this.roomRuntime.delete(roomId);
  }

  private getRoomRuntime(roomId: number): RoomRuntime {
    const existing = this.roomRuntime.get(roomId);
    if (existing) {
      return existing;
    }

    const runtime: RoomRuntime = {
      answeredByQuestion: new Map<number, Set<number>>(),
      scoresByUser: new Map<number, number>(),
      totalAnswers: 0,
    };

    this.roomRuntime.set(roomId, runtime);
    return runtime;
  }

  private buildLeaderboard(runtime: RoomRuntime): GameLeaderboardEntry[] {
    return [...runtime.scoresByUser.entries()]
      .map(([userId, score]) => ({ userId, score }))
      .sort((left, right) => right.score - left.score || left.userId - right.userId);
  }

  private syncScoresWithPlayers(playerIds: number[], runtime: RoomRuntime): void {
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

  private getQuestionEntry(questionId: number): QuestionEntry {
    const question = this.questionBank.get(questionId);
    if (!question) {
      throw new ConflictException(`Question ${questionId} not configured`);
    }
    return question;
  }
}
