// Ce DTO decrit le payload WebSocket qui termine une partie Wordle.
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class GameFinishEventDto {
  // Identifiant de la room dont la partie doit se terminer.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;
}
