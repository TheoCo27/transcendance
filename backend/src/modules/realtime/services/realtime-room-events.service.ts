import { ChatMessageDto } from "@/modules/realtime/dto/chat-message.dto";
import { RoomCreateEventDto } from "@/modules/realtime/dto/room-create-event.dto";
import { RoomJoinEventDto } from "@/modules/realtime/dto/room-join-event.dto";
import { RoomLeaveDto } from "@/modules/realtime/dto/room-leave.dto";
import { RoomStartDto } from "@/modules/realtime/dto/room-start.dto";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RealtimeGameRuntimeService } from "./realtime-game-runtime.service";
import { RealtimePresenceService } from "./realtime-presence.service";
import { RealtimeResponseService } from "./realtime-response.service";
import { RealtimeValidationService } from "./realtime-validation.service";

const CHAT_HISTORY_LIMIT = 100;

@Injectable()
export class RealtimeRoomEventsService {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly validation: RealtimeValidationService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
  ) {}

  async handleDisconnect(clientId: string): Promise<void> {
    this.presence.unregisterSocket(clientId);
  }

  async handleRoomList(client: Socket): Promise<void> {
    client.emit("room:list", this.response.ok(await this.roomsService.list()));
  }

  async handleRoomCreate(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(
      RoomCreateEventDto,
      rawPayload,
    );
    const requesterUserId = this.presence.resolveSocketUser(
      client.id,
      payload.userId,
    );
    const { userId, ...createDto } = payload;
    const room = await this.roomsService.create({
      ...createDto,
      ownerUserId: requesterUserId,
    });

    client.join(this.roomChannel(room.id));
    client.emit("room:created", this.response.ok(room));
    server
      .to(this.roomChannel(room.id))
      .emit("room:state", this.response.ok(room));
    await this.broadcastRoomList(server);
  }

  async handleRoomJoin(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(
      RoomJoinEventDto,
      rawPayload,
    );
    const requesterUserId = this.presence.resolveSocketUser(
      client.id,
      payload.userId,
    );

    const room = await this.roomsService.join(payload.roomId, {
      userId: requesterUserId,
      password: payload.password,
    });

    client.join(this.roomChannel(payload.roomId));
    client.emit("room:joined", this.response.ok(room));
    client.emit(
      "chat:history",
      this.response.ok({
        roomId: payload.roomId,
        messages: await this.roomsService.listMessages(
          payload.roomId,
          CHAT_HISTORY_LIMIT,
        ),
      }),
    );
    server
      .to(this.roomChannel(payload.roomId))
      .emit("room:state", this.response.ok(room));
    await this.broadcastRoomList(server);
  }

  async handleRoomLeave(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(RoomLeaveDto, rawPayload);
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);
    await this.assertUserInRoom(payload.roomId, userId);

    const room = await this.roomsService.leave(payload.roomId, userId);
    const channel = this.roomChannel(payload.roomId);

    client.leave(channel);
    client.emit(
      "room:left",
      this.response.ok({ roomId: payload.roomId, userId }),
    );

    if (room.players.length === 0) {
      const closed = await this.gameRuntime.closeRoom(
        payload.roomId,
        "room_empty",
        server,
      );
      client.emit("room:closed", this.response.ok(closed));
      await this.broadcastRoomList(server);
      return;
    }

    server.to(channel).emit("room:state", this.response.ok(room));
    await this.broadcastRoomList(server);
  }

  async handleRoomStart(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(RoomStartDto, rawPayload);
    const requesterUserId = this.presence.resolveSocketUser(
      client.id,
      payload.userId,
      "room:start requires a bound userId on this socket",
    );
    await this.assertUserInRoom(payload.roomId, requesterUserId);

    const room = await this.roomsService.start(payload.roomId, requesterUserId);
    server
      .to(this.roomChannel(payload.roomId))
      .emit("room:started", this.response.ok(room));
    await this.gameRuntime.startGameLoop(payload.roomId, server);
    await this.broadcastRoomList(server);
  }

  async handleChatMessage(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(ChatMessageDto, rawPayload);
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);
    await this.assertUserInRoom(payload.roomId, userId);

    const content = payload.content?.trim();
    if (!content) {
      client.emit(
        "chat:message:error",
        this.response.fail("BAD_REQUEST", "Message content is required"),
      );
      return;
    }

    const message = await this.roomsService.createMessage({
      roomId: payload.roomId,
      userId,
      content,
    });

    server
      .to(this.roomChannel(payload.roomId))
      .emit("chat:message", this.response.ok(message));
  }

  private async assertUserInRoom(roomId: number, userId: number) {
    const room = await this.roomsService.getById(roomId);
    if (!room.players.some((player) => player.userId === userId)) {
      throw new UnauthorizedException("User is not in this room");
    }
    return room;
  }

  private async broadcastRoomList(server: Server): Promise<void> {
    server.emit(
      "room:list-updated",
      this.response.ok(await this.roomsService.list()),
    );
  }

  private roomChannel(roomId: number): string {
    return `room:${roomId}`;
  }
}
