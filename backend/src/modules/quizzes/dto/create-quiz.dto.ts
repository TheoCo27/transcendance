import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  @ApiProperty({
    example: "Quelle est la capitale du Japon ?",
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  questionText: string;

  @ApiProperty({
    example: ["Seoul", "Tokyo", "Kyoto", "Osaka"],
    type: [String],
    minItems: 2,
    maxItems: 4,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  answers: string[];

  @ApiProperty({ example: 1, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  correctAnswerIndex: number;

  @ApiPropertyOptional({ example: 100, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  points?: number;
}

export class CreateQuizDto {
  @ApiProperty({ example: "Culture generale", minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ enum: [10, 30], example: 30, nullable: true })
  @IsOptional()
  @IsIn([10, 30, null])
  questionDurationSec?: 10 | 30 | null;

  @ApiProperty({
    type: () => CreateQuizQuestionDto,
    isArray: true,
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions: CreateQuizQuestionDto[];
}
