import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class JoinRoomDto {
  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiPropertyOptional({ example: "secret-room-pass", maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;
}
