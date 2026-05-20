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
  @ApiProperty({ example: "Quiz du soir", minLength: 2, maxLength: 40 })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  rounds?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quizId?: number;

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

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ example: "secret-room-pass", minLength: 4, maxLength: 64 })
  @ValidateIf((dto: CreateRoomDto) => dto.isPrivate === true)
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password?: string;
}
