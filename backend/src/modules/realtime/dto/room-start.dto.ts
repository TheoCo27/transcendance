// Ce DTO decrit le payload WebSocket qui demande le lancement
// d'une partie dans une room.
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class RoomStartDto {
  // Identifiant de la room a lancer.
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
