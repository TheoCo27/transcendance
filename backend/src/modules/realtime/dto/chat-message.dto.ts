import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";

export class ChatMessageDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    example: "Bonne chance a tous !",
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
