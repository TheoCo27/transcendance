// Ce DTO decrit la demande d'ajout d'un ami par pseudo.
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SendFriendRequestDto {
  // Pseudo cible auquel envoyer la demande d'ami.
  @ApiProperty({ example: "friend42", minLength: 2 })
  @IsString()
  @MinLength(2)
  username: string;
}
