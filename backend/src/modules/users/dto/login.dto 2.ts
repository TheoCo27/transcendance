import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "alex@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "supersecurepass", minLength: 12, writeOnly: true })
  @IsString()
  @MinLength(12)
  password: string;
}
