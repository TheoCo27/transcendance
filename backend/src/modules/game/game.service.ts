import { RoomsService } from "@/modules/rooms/rooms.service";
import { ConflictException, Injectable } from "@nestjs/common";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";

export type GameState = {
  roomId: number;
  currentQuestionId: number;
  totalAnswers: number;
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

type RoomRuntime = {
  answeredByQuestion: Map<number, Set<number>>;
  scoresByUser: Map<number, number>;
};

@Injectable()
export class GameService {
  private readonly roomStates = new Map<number, GameState>();
  private readonly roomRuntime = new Map<number, RoomRuntime>();
  private readonly answerKey = new Map<number, number>([
    [101, 1],
    [102, 2],
    [103, 1],
  ]);

  constructor(private readonly roomsService: RoomsService) {}

  getRoomState(roomId: number): GameState {
    this.roomsService.getById(roomId);

    const existing = this.roomStates.get(roomId);
    if (existing) {
      return existing;
    }

    const state: GameState = {
      roomId,
      currentQuestionId: 101,
      totalAnswers: 0,
      updatedAt: new Date().toISOString(),
    };

    this.roomStates.set(roomId, state);
    return state;
  }

  submitAnswer(dto: SubmitAnswerDto): SubmitAnswerResult {
    this.roomsService.getById(dto.roomId);

    const state = this.getRoomState(dto.roomId);
    const runtime = this.getRoomRuntime(dto.roomId);

    const answeredUsers =
      runtime.answeredByQuestion.get(dto.questionId) || new Set<number>();
    if (answeredUsers.has(dto.userId)) {
      throw new ConflictException("User already answered this question");
    }
    answeredUsers.add(dto.userId);
    runtime.answeredByQuestion.set(dto.questionId, answeredUsers);

    state.totalAnswers += 1;
    state.updatedAt = new Date().toISOString();
    state.currentQuestionId = dto.questionId;

    const isCorrect = this.answerKey.get(dto.questionId) === dto.answerIndex;
    const scoreDelta = isCorrect ? 100 : 0;
    const previousScore = runtime.scoresByUser.get(dto.userId) || 0;
    const userTotalScore = previousScore + scoreDelta;
    runtime.scoresByUser.set(dto.userId, userTotalScore);

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

  setCurrentQuestion(roomId: number, questionId: number): GameState {
    const state = this.getRoomState(roomId);
    state.currentQuestionId = questionId;
    state.updatedAt = new Date().toISOString();
    return state;
  }

  getQuestionOrder(): number[] {
    return [...this.answerKey.keys()].sort((a, b) => a - b);
  }

  getRoomLeaderboard(roomId: number): Array<{ userId: number; score: number }> {
    this.roomsService.getById(roomId);
    const runtime = this.getRoomRuntime(roomId);

    return [...runtime.scoresByUser.entries()]
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
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
    };

    this.roomRuntime.set(roomId, runtime);
    return runtime;
  }
}
