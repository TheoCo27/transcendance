// Ce DTO decrit le formulaire d'inscription classique.
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
  // Email unique du nouveau compte.
  @ApiProperty({ example: "alex@example.com" })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(20, { message: "L'email est trop long" })
  email: string;

  // Pseudo choisi pour le nouveau compte.
  @ApiProperty({ example: "alex42", minLength: 2 })
  @IsString()
  @MaxLength(20, { message: 'Pseudo too long' })
  @MinLength(2)
  username: string;

  // Mot de passe initial du nouveau compte.
  @ApiProperty({ example: "supersecurepass", minLength: 12, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(40, { message: 'Password too long' })
  password: string;
}
