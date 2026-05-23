// Ce DTO decrit la demande explicite de rechargement
// de l'historique de chat d'une room.
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class ChatHistoryRequestDto {
  // Room cible dont il faut renvoyer l'historique.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  // Utilisateur demandeur, verifie contre le socket authentifie.
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;
}
