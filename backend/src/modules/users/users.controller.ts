// Ce fichier expose les endpoints HTTP lies au profil utilisateur,
// au systeme d'amis et aux messages prives.
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { AuthPayload } from "@/modules/auth/types/auth-payload.type";
import { User } from "@generated/prisma/client";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { SafeUser } from "../auth/types/safe-user.type";
import { FriendRequestActionDto } from "./dto/friend-request-action.dto";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { SendPrivateMessageDto } from "./dto/send-private-message.dto";
import { UpdateAvatarDto } from "./dto/update-avatar.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import {
  PrivateConversationSummary,
  PrivateMessagesService,
  type PrivateMessage,
} from "./private-messages.service";
import {
  FriendActionResult,
  FriendOverview,
  UsersService,
} from "./users.service";

@Controller("users")
@UseFilters(ApiExceptionFilter)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly privateMessagesService: PrivateMessagesService,
  ) {}

  // Retourne le profil public de l'utilisateur authentifie.
  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<SafeUser>> {
    const user = await this.usersService.findUser({ id: auth.sub });

    if (!user) {
      throw new NotFoundException(`User ${auth.sub} not found`);
    }

    return ok(this.sanitizeUser(user));
  }

  // Met a jour ou supprime l'avatar du compte courant.
  @Patch("me/avatar")
  @UseGuards(AuthGuard)
  async updateAvatar(
    @CurrentUser() auth: AuthPayload,
    @Body() dto: UpdateAvatarDto,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(
      this.sanitizeUser(
        await this.usersService.updateAvatar(auth.sub, dto.avatarDataUrl ?? null),
      ),
    );
  }

  // Met a jour le pseudo et le statut du compte courant.
  @Patch("me/profile")
  @UseGuards(AuthGuard)
  async updateProfile(
    @CurrentUser() auth: AuthPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<SafeUser>> {
    return ok(
      this.sanitizeUser(
        await this.usersService.updateProfile(auth.sub, {
          username: dto.username,
          status: dto.status,
        }),
      ),
    );
  }

  // Retourne la vue consolidee du reseau d'amis du compte courant.
  @Get("me/friends")
  @UseGuards(AuthGuard)
  async getFriendOverview(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<FriendOverview>> {
    return ok(await this.usersService.getFriendOverview(auth.sub));
  }

  // Envoie une demande d'ami au pseudo cible.
  @Post("me/friends")
  @UseGuards(AuthGuard)
  async sendFriendRequest(
    @CurrentUser() auth: AuthPayload,
    @Body() dto: SendFriendRequestDto,
  ): Promise<ApiResponse<FriendActionResult>> {
    return ok(await this.usersService.sendFriendRequest(auth.sub, dto.username));
  }

  // Accepte ou refuse une demande d'ami recue.
  @Patch("me/friends/requests/:requestId")
  @UseGuards(AuthGuard)
  async respondToFriendRequest(
    @CurrentUser() auth: AuthPayload,
    @Param("requestId", ParseIntPipe) requestId: number,
    @Body() dto: FriendRequestActionDto,
  ): Promise<ApiResponse<FriendActionResult>> {
    return ok(
      await this.usersService.respondToFriendRequest(
        auth.sub,
        requestId,
        dto.action,
      ),
    );
  }

  // Retourne la synthese des conversations privees du compte courant.
  @Get("me/friends/conversations")
  @UseGuards(AuthGuard)
  async getConversationSummaries(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<PrivateConversationSummary[]>> {
    return ok(
      await this.privateMessagesService.listConversationSummaries(auth.sub),
    );
  }

  // Retourne le detail des messages prives avec un ami donne.
  @Get("me/friends/messages/:friendId")
  @UseGuards(AuthGuard)
  async getPrivateConversation(
    @CurrentUser() auth: AuthPayload,
    @Param("friendId", ParseIntPipe) friendId: number,
  ): Promise<ApiResponse<PrivateMessage[]>> {
    return ok(
      await this.privateMessagesService.listConversation(auth.sub, friendId),
    );
  }

  // Envoie un message prive a un ami.
  @Post("me/friends/messages/:friendId")
  @UseGuards(AuthGuard, ThrottlerGuard)
  async sendPrivateMessage(
    @CurrentUser() auth: AuthPayload,
    @Param("friendId", ParseIntPipe) friendId: number,
    @Body() dto: SendPrivateMessageDto,
  ): Promise<ApiResponse<PrivateMessage>> {
    return ok(
      await this.privateMessagesService.sendMessage(
        auth.sub,
        friendId,
        dto.content,
      ),
    );
  }

  // Retourne le profil public d'un utilisateur par son identifiant.
  @Get(":id")
  async getById(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ApiResponse<SafeUser>> {
    const user = await this.usersService.findUser({ id });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return ok(this.sanitizeUser(user));
  }

  // Supprime les champs sensibles avant d'exposer un utilisateur au frontend.
  private sanitizeUser(user: User): SafeUser {
    const { googleId, password, ...safeUser } = user;
    return safeUser;
  }
}
