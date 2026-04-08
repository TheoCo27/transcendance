import { JoinRoomDto } from "@/modules/rooms/dto/join-room.dto";
import { IsInt, Min } from "class-validator";

export class RoomJoinEventDto extends JoinRoomDto {
  @IsInt()
  @Min(1)
  roomId: number;
}

