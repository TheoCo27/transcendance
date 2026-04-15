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
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsIn(["wordle", "memory"])
  gameType?: "wordle" | "memory";

  @IsOptional()
  @IsObject()
  gameConfig?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password?: string;
}
