// Ce DTO decrit la progression Wordle envoyee pendant la manche.
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, Min } from "class-validator";

export class GameProgressEventDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiProperty({ example: 2, minimum: 0 })
  @IsInt()
  @Min(0)
  currentGuess: number;

  @ApiProperty({ example: 1716900000, minimum: 0 })
  @IsInt()
  @Min(0)
  startTime: number;

  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  timePerWordSeconds: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  won: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  lost: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  endedByTimeout: boolean;
}