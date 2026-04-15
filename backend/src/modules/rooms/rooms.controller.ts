import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { AuthPayload } from "@/modules/auth/types/auth-payload.type";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { Room, RoomsService } from "./rooms.service";

@Controller("rooms")
@UseFilters(ApiExceptionFilter)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list(): Promise<ApiResponse<Array<Omit<Room, "password">>>> {
    return ok(await this.roomsService.list());
  }

  @Get(":roomId")
  async getById(
    @Param("roomId", ParseIntPipe) roomId: number,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.getById(roomId));
  }

  @Post()
  async create(
    @Body() dto: CreateRoomDto,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.create(dto));
  }

  @Post(":roomId/join")
  async join(
    @Param("roomId", ParseIntPipe) roomId: number,
    @Body() dto: JoinRoomDto,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.join(roomId, dto));
  }

  @Patch(":roomId")
  @UseGuards(AuthGuard)
  async update(
    @Param("roomId", ParseIntPipe) roomId: number,
    @CurrentUser() auth: AuthPayload,
    @Body() dto: UpdateRoomDto,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.update(roomId, auth.sub, dto));
  }
}
