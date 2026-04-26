import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class SubmitAnswerDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ example: 7, minimum: 1 })
  @IsInt()
  @Min(1)
  questionId: number;

  @ApiProperty({ example: 2, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  answerIndex: number;
}
