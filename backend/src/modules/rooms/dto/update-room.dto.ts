import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: "Quiz du samedi", minLength: 2, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional({ enum: ["wordle", "memory"], example: "wordle" })
  @IsOptional()
  @IsIn(["wordle", "memory"])
  gameType?: "wordle" | "memory";

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    example: { difficulty: "medium" },
  })
  @IsOptional()
  @IsObject()
  gameConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ example: "updated-room-pass", minLength: 4, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password?: string;
}
