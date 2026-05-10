// Ce fichier definit le payload minimal necessaire pour rejoindre une room.
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class JoinRoomDto {
  // Identifiant du joueur qui souhaite entrer dans la room.
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  // Mot de passe eventuellement fourni pour une room privee.
  @ApiPropertyOptional({ example: "secret-room-pass", maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;
}
