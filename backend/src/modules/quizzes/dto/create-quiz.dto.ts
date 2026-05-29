// Ce fichier definit les DTOs utilises pour creer un quiz
// et chacune de ses questions.
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateQuizQuestionDto {
  // Intitule de la question tel qu'il sera affiche aux joueurs.
  @ApiProperty({
    example: "Quelle est la capitale du Japon ?",
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  questionText: string;

  // Liste des propositions de reponse pour la question.
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

  // Position de la bonne reponse dans le tableau `answers`.
  @ApiProperty({ example: 1, minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  correctAnswerIndex: number;

  // Nombre de points accordes si la question est reussie.
  @ApiPropertyOptional({ example: 100, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  points?: number;
}

export class CreateQuizDto {
  // Titre global du quiz visible dans les listes et les pages de quiz.
  @ApiProperty({ example: "Culture generale", minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  // Ensemble ordonne des questions qui composent le quiz.
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
