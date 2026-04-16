import { IsString, MinLength } from "class-validator";

export class SendFriendRequestDto {
  @IsString()
  @MinLength(2)
  username: string;
}
