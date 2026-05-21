// Ce fichier expose les endpoints HTTP permettant de lister, creer,
// rejoindre et configurer les rooms.
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { AuthPayload } from "@/modules/auth/types/auth-payload.type";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
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

  // Retourne toutes les rooms visibles sans exposer les mots de passe.
  @Get()
  async list(): Promise<ApiResponse<Array<Omit<Room, "password">>>> {
    return ok(await this.roomsService.list());
  }

  // Retourne les rooms rattachees a un quiz donne.
  @Get("quizzes/:quizId")
  async listByQuizId(
    @Param("quizId", ParseIntPipe) quizId: number,
  ): Promise<ApiResponse<Array<Omit<Room, "password">>>> {
    return ok(await this.roomsService.listByQuizId(quizId));
  }

  // Retourne la room publique correspondant a un nom donne.
  @Get("by-name")
  async getByName(
    @Query("name") roomName?: string,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    if (typeof roomName !== "string" || roomName.trim().length === 0) {
      throw new BadRequestException("Le nom de la room est requis");
    }

    return ok(await this.roomsService.getByName(roomName));
  }

  // Retourne le detail public d'une room.
  @Get(":roomId")
  async getById(
    @Param("roomId", ParseIntPipe) roomId: number,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.getById(roomId));
  }

  // Cree une nouvelle room au nom de l'utilisateur authentifie.
  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() auth: AuthPayload,
    @Body() dto: CreateRoomDto,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.create({ ...dto, ownerUserId: auth.sub }));
  }

  // Fait rejoindre une room a un utilisateur.
  @Post(":roomId/join")
  async join(
    @Param("roomId", ParseIntPipe) roomId: number,
    @Body() dto: JoinRoomDto,
  ): Promise<ApiResponse<Omit<Room, "password">>> {
    return ok(await this.roomsService.join(roomId, dto));
  }

  // Met a jour la configuration editable d'une room.
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
