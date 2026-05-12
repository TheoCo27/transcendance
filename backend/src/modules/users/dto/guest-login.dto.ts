// Ce DTO decrit les donnees minimales necessaires a une connexion invite.
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class GuestLoginDto {
  // Pseudo souhaite pour la session invite.
  @ApiProperty({ example: "guest_player", minLength: 2 })
  @IsString()
  @MinLength(2)
  username: string;
}
