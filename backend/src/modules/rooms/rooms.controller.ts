import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
} from "@nestjs/common";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { Room, RoomsService } from "./rooms.service";

@Controller("rooms")
@UseFilters(ApiExceptionFilter)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(): ApiResponse<Array<Omit<Room, "password">>> {
    return ok(this.roomsService.list());
  }

  @Get(":roomId")
  getById(
    @Param("roomId", ParseIntPipe) roomId: number,
  ): ApiResponse<Omit<Room, "password">> {
    return ok(this.roomsService.getById(roomId));
  }

  @Post()
  create(@Body() dto: CreateRoomDto): ApiResponse<Omit<Room, "password">> {
    return ok(this.roomsService.create(dto));
  }

  @Post(":roomId/join")
  join(
    @Param("roomId", ParseIntPipe) roomId: number,
    @Body() dto: JoinRoomDto,
  ): ApiResponse<Omit<Room, "password">> {
    return ok(this.roomsService.join(roomId, dto));
  }
}
