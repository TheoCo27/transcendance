// Ce DTO decrit le payload WebSocket qui marque un joueur comme pret.
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class RoomReadyDto {
  // Identifiant de la room concernee.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;
}