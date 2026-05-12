// Ce DTO decrit le payload WebSocket utilise pour quitter une room.
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class RoomLeaveDto {
  // Identifiant de la room a quitter.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  // Identifiant du joueur qui quitte la room.
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;
}
