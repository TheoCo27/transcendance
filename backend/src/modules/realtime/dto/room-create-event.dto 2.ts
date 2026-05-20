import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateRoomDto } from "@/modules/rooms/dto/create-room.dto";
import { IsInt, IsOptional, Min } from "class-validator";

export class RoomCreateEventDto extends CreateRoomDto {
  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
