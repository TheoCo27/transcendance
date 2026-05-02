import { ApiProperty } from "@nestjs/swagger";
import { JoinRoomDto } from "@/modules/rooms/dto/join-room.dto";
import { IsInt, Min } from "class-validator";

export class RoomJoinEventDto extends JoinRoomDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @IsInt()
  @Min(1)
  roomId: number;
}
