// Ce fichier definit le payload WebSocket attendu pour l'envoi
// d'un message de chat dans une room.
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";

export class ChatMessageDto {
  // Room cible du message.
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  // Utilisateur emetteur du message.
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  // Texte libre envoye dans le chat.
  @ApiProperty({
    example: "Bonne chance a tous !",
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
