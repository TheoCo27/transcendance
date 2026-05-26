// Ce DTO decrit les informations modifiables depuis la page profil.
import { UserStatus } from "@generated/prisma/client";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";

export class UpdateProfileDto {
  // Nouveau pseudo choisi par l'utilisateur.
  @ApiProperty({ example: "alex42", minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20, { message: 'nickname too long' })
  @MinLength(2)
  username: string;

  // Nouveau statut de presence expose dans l'application.
  @ApiProperty({ enum: UserStatus, example: UserStatus.online })
  @IsEnum(UserStatus)
  status: UserStatus;
}
