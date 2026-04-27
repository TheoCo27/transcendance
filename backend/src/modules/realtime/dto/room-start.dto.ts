import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class RoomStartDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
