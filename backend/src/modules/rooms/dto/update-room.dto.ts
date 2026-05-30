// Ce fichier definit le DTO de mise a jour de configuration d'une room.
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class UpdateRoomDto {
  // Nouveau nom optionnel de la room.
  @ApiPropertyOptional({ example: "Quiz du samedi", minLength: 2, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  // Type de jeu associe a la room.
  @ApiPropertyOptional({ enum: ["quiz"], example: "quiz" })
  @IsOptional()
  @IsIn(["quiz"])
  gameType?: "quiz";

  // Configuration libre du mini-jeu choisi.
  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    example: { difficulty: "medium" },
  })
  @IsOptional()
  @IsObject()
  gameConfig?: Record<string, unknown>;

  // Bascule la room en mode public ou prive.
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  // Nouveau mot de passe si la room est privee.
  @ApiPropertyOptional({ example: "updated-room-pass", minLength: 4, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password?: string;

  // Quiz cible a associer ou detacher de la room.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  quizId?: number | null;
}
