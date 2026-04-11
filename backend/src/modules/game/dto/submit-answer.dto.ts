import { IsInt, Max, Min } from "class-validator";

export class SubmitAnswerDto {
  @IsInt()
  @Min(1)
  roomId: number;

  @IsInt()
  @Min(1)
  userId: number;

  @IsInt()
  @Min(1)
  questionId: number;

  @IsInt()
  @Min(0)
  @Max(3)
  answerIndex: number;
}

