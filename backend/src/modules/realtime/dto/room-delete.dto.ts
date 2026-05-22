// Ce DTO decrit le payload WebSocket utilise pour supprimer une room.
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class RoomDeleteDto {
  // Identifiant de la room a supprimer.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  // Identifiant du joueur initiateur si le client l'envoie explicitement.
  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
