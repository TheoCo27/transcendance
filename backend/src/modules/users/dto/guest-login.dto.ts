// Ce DTO decrit les donnees minimales necessaires a une connexion invite.
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength } from "class-validator";

export class GuestLoginDto {
  // Pseudo souhaite pour la session invite.
  @ApiProperty({ example: "guest_player", minLength: 2 })
  @IsString()
  @MaxLength(20, { message: 'nickname too long' })
  @MinLength(2)
  username: string;
}
