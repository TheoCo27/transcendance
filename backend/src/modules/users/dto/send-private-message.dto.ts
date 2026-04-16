import { IsString, MaxLength, MinLength } from "class-validator";

export class SendPrivateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
