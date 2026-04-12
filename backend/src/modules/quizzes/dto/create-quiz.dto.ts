import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateQuizQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  questionText: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  answers: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctAnswerIndex: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  points?: number;
}

export class CreateQuizDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsIn([10, 30, null])
  questionDurationSec?: 10 | 30 | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions: CreateQuizQuestionDto[];
}
