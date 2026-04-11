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

export type PublicQuestion = {
  id: number;
  text: string;
  options: string[];
};

type RoomRuntime = {
  answeredByQuestion: Map<number, Set<number>>;
  scoresByUser: Map<number, number>;
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

    const question = this.getQuestionEntry(dto.questionId);
    const isCorrect = question.correctAnswerIndex === dto.answerIndex;
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

  private getQuestionEntry(questionId: number): QuestionEntry {
    const question = this.questionBank.get(questionId);
    if (!question) {
      throw new ConflictException(`Question ${questionId} not configured`);
    }
    return question;
  }
}
