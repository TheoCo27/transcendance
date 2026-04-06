import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(2)
  username: string;

  @IsString()
  @MinLength(12)
  password: string;
}
