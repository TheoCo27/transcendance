import { RoomsService } from "@/modules/rooms/rooms.service";
import { Injectable } from "@nestjs/common";
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
  totalAnswers: number;
};

@Injectable()
export class GameService {
  private readonly roomStates = new Map<number, GameState>();
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
    state.totalAnswers += 1;
    state.updatedAt = new Date().toISOString();
    state.currentQuestionId = dto.questionId;

    const isCorrect = this.answerKey.get(dto.questionId) === dto.answerIndex;

    return {
      roomId: dto.roomId,
      userId: dto.userId,
      questionId: dto.questionId,
      selectedAnswerIndex: dto.answerIndex,
      isCorrect,
      scoreDelta: isCorrect ? 100 : 0,
      totalAnswers: state.totalAnswers,
    };
  }
}
