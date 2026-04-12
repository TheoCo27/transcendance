import { IsString, MinLength } from "class-validator";

export class GuestLoginDto {
  @IsString()
  @MinLength(2)
  username: string;
}
