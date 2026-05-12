// Ce DTO etend la creation de room HTTP avec un `userId` optionnel
// pour les evenements temps reel.
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateRoomDto } from "@/modules/rooms/dto/create-room.dto";
import { IsInt, IsOptional, Min } from "class-validator";

export class RoomCreateEventDto extends CreateRoomDto {
  // Utilisateur initiateur de la creation quand le client l'envoie explicitement.
  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
