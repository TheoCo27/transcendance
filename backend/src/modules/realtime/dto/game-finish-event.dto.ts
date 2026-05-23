// Ce DTO decrit le payload WebSocket envoye quand un joueur termine Wordle.
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, Min } from "class-validator";

export class GameFinishEventDto {
  // Identifiant de la room Wordle concernee.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  // Indique si le joueur a trouve le mot.
  @ApiProperty({ example: true })
  @IsBoolean()
  won: boolean;

  // Nombre de tentatives consommees au moment de la fin.
  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  attemptsUsed: number;
}
