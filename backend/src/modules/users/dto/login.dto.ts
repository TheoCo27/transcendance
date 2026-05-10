// Ce DTO decrit le formulaire de connexion classique par email.
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  // Email du compte a authentifier.
  @ApiProperty({ example: "alex@example.com" })
  @IsEmail()
  email: string;

  // Mot de passe en clair fourni au moment du login.
  @ApiProperty({ example: "supersecurepass", minLength: 12, writeOnly: true })
  @IsString()
  @MinLength(12)
  password: string;
}
