import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SendFriendRequestDto {
  @ApiProperty({ example: "friend42", minLength: 2 })
  @IsString()
  @MinLength(2)
  username: string;
}
