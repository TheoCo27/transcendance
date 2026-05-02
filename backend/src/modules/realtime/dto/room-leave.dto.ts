import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class RoomLeaveDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;
}
