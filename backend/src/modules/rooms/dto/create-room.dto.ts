// Ce fichier definit le DTO utilise pour creer une room via HTTP ou WS.
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateRoomDto {
  // Nom lisible de la room.
  @ApiProperty({ example: "Quiz du soir", minLength: 2, maxLength: 40 })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  // Nombre de tours attendu pour les jeux qui n'utilisent pas un quiz.
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  rounds?: number;

  // Quiz rattache a la room lorsque le mode `quiz` est selectionne.
  @ApiPropertyOptional({ example: 3, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quizId?: number;

  // Duree par question en secondes pour les rooms de quiz.
  @ApiPropertyOptional({
    example: 30,
    minimum: 10,
    maximum: 30,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(30)
  questionDurationSec?: number | null;

  // Indique si la room doit etre protegee par mot de passe.
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  // Mot de passe requis si la room est privee.
  @ApiPropertyOptional({ example: "secret-room-pass", minLength: 4, maxLength: 64 })
  @ValidateIf((dto: CreateRoomDto) => dto.isPrivate === true)
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password?: string;
}
