import { CreateRoomDto } from "@/modules/rooms/dto/create-room.dto";
import { IsInt, IsOptional, Min } from "class-validator";

export class RoomCreateEventDto extends CreateRoomDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}

