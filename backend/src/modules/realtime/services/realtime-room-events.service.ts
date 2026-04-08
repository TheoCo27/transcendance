import { RoomsService } from "@/modules/rooms/rooms.service";
import { ChatMessageDto } from "@/modules/realtime/dto/chat-message.dto";
import { RoomCreateEventDto } from "@/modules/realtime/dto/room-create-event.dto";
import { RoomJoinEventDto } from "@/modules/realtime/dto/room-join-event.dto";
import { RoomLeaveDto } from "@/modules/realtime/dto/room-leave.dto";
import { RoomStartDto } from "@/modules/realtime/dto/room-start.dto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RealtimeGameRuntimeService } from "./realtime-game-runtime.service";
import { RealtimePresenceService } from "./realtime-presence.service";
import { RealtimeResponseService } from "./realtime-response.service";
import { RealtimeValidationService } from "./realtime-validation.service";

@Injectable()
export class RealtimeRoomEventsService {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly validation: RealtimeValidationService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
  ) {}

  handleDisconnect(clientId: string, server: Server): void {
    const userId = this.presence.unregisterSocket(clientId);
    if (typeof userId === "number" && !this.presence.hasActiveSockets(userId)) {
      this.removeUserFromRooms(userId, server);
    }
  }

  handleRoomList(client: Socket): void {
    client.emit("room:list", this.response.ok(this.roomsService.list()));
  }

  handleRoomCreate(rawPayload: unknown, client: Socket, server: Server): void {
    const payload = this.validation.validatePayload(RoomCreateEventDto, rawPayload);
    const requesterUserId = this.presence.resolveSocketUser(client.id, payload.userId);
    const { userId, ...createDto } = payload;
    const created = this.roomsService.create({
      ...createDto,
      ownerUserId: requesterUserId,
    });
    const room = this.roomsService.join(created.id, {
      userId: requesterUserId,
      password: payload.password,
    });

    client.join(this.roomChannel(room.id));
    client.emit("room:created", this.response.ok(room));
    server.to(this.roomChannel(room.id)).emit("room:state", this.response.ok(room));
    this.broadcastRoomList(server);
  }

  handleRoomJoin(rawPayload: unknown, client: Socket, server: Server): void {
    const payload = this.validation.validatePayload(RoomJoinEventDto, rawPayload);
    const room = this.roomsService.join(payload.roomId, {
      userId: this.presence.resolveSocketUser(client.id, payload.userId),
      password: payload.password,
    });

    client.join(this.roomChannel(payload.roomId));
    client.emit("room:joined", this.response.ok(room));
    server
      .to(this.roomChannel(payload.roomId))
      .emit("room:state", this.response.ok(room));
    this.broadcastRoomList(server);
  }

  handleRoomLeave(rawPayload: unknown, client: Socket, server: Server): void {
    const payload = this.validation.validatePayload(RoomLeaveDto, rawPayload);
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);
    this.assertUserInRoom(payload.roomId, userId);

    const room = this.roomsService.leave(payload.roomId, userId);
    const channel = this.roomChannel(payload.roomId);

    client.leave(channel);
    client.emit("room:left", this.response.ok({ roomId: payload.roomId, userId }));

    if (room.players.length === 0) {
      const closed = this.gameRuntime.closeRoom(payload.roomId, "room_empty", server);
      client.emit("room:closed", this.response.ok(closed));
      return;
    }

    server.to(channel).emit("room:state", this.response.ok(room));
    this.broadcastRoomList(server);
  }

  handleRoomStart(rawPayload: unknown, client: Socket, server: Server): void {
    const payload = this.validation.validatePayload(RoomStartDto, rawPayload);
    const requesterUserId = this.presence.resolveSocketUser(
      client.id,
      payload.userId,
      "room:start requires a bound userId on this socket",
    );
    const roomState = this.assertUserInRoom(payload.roomId, requesterUserId);
    if (
      typeof roomState.ownerUserId === "number" &&
      roomState.ownerUserId !== requesterUserId
    ) {
      throw new UnauthorizedException("Only room owner can start the game");
    }

    const room = this.roomsService.start(payload.roomId);
    server.to(this.roomChannel(payload.roomId)).emit("room:started", this.response.ok(room));
    this.gameRuntime.startGameLoop(payload.roomId, room.rounds, server);
    this.broadcastRoomList(server);
  }

  handleChatMessage(rawPayload: unknown, client: Socket, server: Server): void {
    const payload = this.validation.validatePayload(ChatMessageDto, rawPayload);
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);
    this.assertUserInRoom(payload.roomId, userId);

    const content = payload.content?.trim();
    if (!content) {
      client.emit(
        "chat:message:error",
        this.response.fail("BAD_REQUEST", "Message content is required"),
      );
      return;
    }

    server.to(this.roomChannel(payload.roomId)).emit(
      "chat:message",
      this.response.ok({
        roomId: payload.roomId,
        userId,
        content,
        sentAt: new Date().toISOString(),
      }),
    );
  }

  private removeUserFromRooms(userId: number, server: Server): void {
    let listUpdated = false;

    for (const room of this.roomsService.list()) {
      if (!room.players.some((player) => player.userId === userId)) {
        continue;
      }

      const updatedRoom = this.roomsService.leave(room.id, userId);
      const channel = this.roomChannel(room.id);
      server
        .to(channel)
        .emit("room:left", this.response.ok({ roomId: room.id, userId }));

      if (updatedRoom.players.length === 0) {
        this.gameRuntime.closeRoom(room.id, "socket_disconnect", server);
        continue;
      }

      server.to(channel).emit("room:state", this.response.ok(updatedRoom));
      listUpdated = true;
    }

    if (listUpdated) {
      this.broadcastRoomList(server);
    }
  }

  private assertUserInRoom(roomId: number, userId: number) {
    const room = this.roomsService.getById(roomId);
    if (!room.players.some((player) => player.userId === userId)) {
      throw new UnauthorizedException("User is not in this room");
    }
    return room;
  }

  private broadcastRoomList(server: Server): void {
    server.emit("room:list-updated", this.response.ok(this.roomsService.list()));
  }

  private roomChannel(roomId: number): string {
    return `room:${roomId}`;
  }
}
