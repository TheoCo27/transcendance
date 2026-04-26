import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class GuestLoginDto {
  @ApiProperty({ example: "guest_player", minLength: 2 })
  @IsString()
  @MinLength(2)
  username: string;
}
