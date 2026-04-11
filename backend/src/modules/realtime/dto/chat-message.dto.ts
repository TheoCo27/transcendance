import { IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";

export class ChatMessageDto {
  @IsInt()
  @Min(1)
  roomId: number;

  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

