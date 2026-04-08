import { IsInt, Min } from "class-validator";

export class RoomLeaveDto {
  @IsInt()
  @Min(1)
  roomId: number;

  @IsInt()
  @Min(1)
  userId: number;
}

