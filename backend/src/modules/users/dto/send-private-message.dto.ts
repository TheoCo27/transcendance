// Ce DTO decrit le contenu d'un message prive entre amis.
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SendPrivateMessageDto {
  // Contenu texte du message prive.
  @ApiProperty({
    example: "Salut, on joue ce soir ?",
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
