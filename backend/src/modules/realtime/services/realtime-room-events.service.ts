// Ce fichier gere les evenements WebSocket lies au cycle de vie des rooms
// et au chat temps reel.
import { ChatMessageDto } from "@/modules/realtime/dto/chat-message.dto";
import { RoomCreateEventDto } from "@/modules/realtime/dto/room-create-event.dto";
import { RoomDeleteDto } from "@/modules/realtime/dto/room-delete.dto";
import { RoomJoinEventDto } from "@/modules/realtime/dto/room-join-event.dto";
import { RoomLeaveDto } from "@/modules/realtime/dto/room-leave.dto";
import { RoomStartDto } from "@/modules/realtime/dto/room-start.dto";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RealtimeGameRuntimeService } from "./realtime-game-runtime.service";
import { RealtimePresenceService } from "./realtime-presence.service";
import { RealtimeRateLimitService } from "./realtime-rate-limit.service";
import { RealtimeResponseService } from "./realtime-response.service";
import { RealtimeValidationService } from "./realtime-validation.service";

const CHAT_HISTORY_LIMIT = 100;
const DISCONNECT_GRACE_PERIOD_MS = 10_000;
const CHAT_MESSAGE_RATE_LIMITS = [
  { limit: 5, windowMs: 5_000 },
  { limit: 20, windowMs: 60_000 },
] as const;

@Injectable()
export class RealtimeRoomEventsService {
  private readonly pendingDisconnectCleanup = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly validation: RealtimeValidationService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
    private readonly rateLimit: RealtimeRateLimitService,
  ) {}

  // Programme le nettoyage d'un utilisateur apres deconnexion.
  async handleDisconnect(clientId: string, server: Server): Promise<void> {
    const userId = await this.presence.unregisterSocket(clientId);
    if (typeof userId !== "number" || this.presence.hasActiveSockets(userId)) {
      return;
    }

    this.scheduleDisconnectCleanup(userId, server);
  }

  // Rejoint a nouveau les rooms du user lors d'une reconnexion.
  async syncSocketRoomMembership(
    userId: number,
    client: Socket,
  ): Promise<void> {
    this.cancelPendingDisconnectCleanup(userId);

    for (const room of await this.roomsService.list()) {
      if (!room.players.some((player) => player.userId === userId)) {
        continue;
      }

      client.join(this.roomChannel(room.id));
      client.emit(
        "chat:history",
        this.response.ok({
          roomId: room.id,
          messages: await this.roomsService.listMessages(
            room.id,
            CHAT_HISTORY_LIMIT,
          ),
        }),
      );
    }
  }

  // Annule tous les timers de nettoyage en attente.
  clearDisconnectCleanupTimers(): void {
    this.pendingDisconnectCleanup.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingDisconnectCleanup.clear();
  }

  // Lance un delai avant de nettoyer les rooms d'un user absent.
  private scheduleDisconnectCleanup(userId: number, server: Server): void {
    this.cancelPendingDisconnectCleanup(userId);

    const timeout = setTimeout(() => {
      this.pendingDisconnectCleanup.delete(userId);
      void this.runDisconnectCleanup(userId, server);
    }, DISCONNECT_GRACE_PERIOD_MS);

    this.pendingDisconnectCleanup.set(userId, timeout);
  }

  // Annule un nettoyage planifie pour un utilisateur.
  private cancelPendingDisconnectCleanup(userId: number): void {
    const timeout = this.pendingDisconnectCleanup.get(userId);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.pendingDisconnectCleanup.delete(userId);
  }

  // Retire un utilisateur de ses rooms apres expiration du delai.
  private async runDisconnectCleanup(
    userId: number,
    server: Server,
  ): Promise<void> {
    if (this.presence.hasActiveSockets(userId)) {
      return;
    }

    let hasRoomStateChanged = false;
    for (const room of await this.roomsService.list()) {
      if (!room.players.some((player) => player.userId === userId)) {
        continue;
      }

      const updatedRoom = await this.roomsService.leave(room.id, userId);
      hasRoomStateChanged = true;

      if (updatedRoom.players.length === 0) {
        await this.gameRuntime.closeRoom(room.id, "room_empty", server);
        continue;
      }

      if (await this.gameRuntime.completeWordleIfReady(room.id, server)) {
        continue;
      }

      server
        .to(this.roomChannel(room.id))
        .emit("room:state", this.response.ok(updatedRoom));
    }

    if (hasRoomStateChanged) {
      await this.broadcastRoomList(server);
    }
  }

  // Envoie la liste actuelle des rooms a un client.
  async handleRoomList(client: Socket): Promise<void> {
    client.emit("room:list", this.response.ok(await this.roomsService.list()));
  }

  // Cree une room depuis un evenement temps reel.
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

  // Fait rejoindre une room a un utilisateur via socket.
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

  // Fait quitter une room et gere sa fermeture si besoin.
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

    if (!(await this.gameRuntime.completeWordleIfReady(payload.roomId, server))) {
      server.to(channel).emit("room:state", this.response.ok(room));
    }
    await this.broadcastRoomList(server);
  }

  // Supprime une room sur demande explicite de son proprietaire.
  async handleRoomDelete(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(RoomDeleteDto, rawPayload);
    const requesterUserId = this.presence.resolveSocketUser(
      client.id,
      payload.userId,
      "room:delete requires a bound userId on this socket",
    );
    const channel = this.roomChannel(payload.roomId);
    const room = await this.roomsService.getById(payload.roomId);

    if (room.ownerUserId !== requesterUserId) {
      throw new UnauthorizedException(
        "Seul le proprietaire de la room peut la supprimer",
      );
    }

    this.gameRuntime.disposeRoomRuntime(payload.roomId);
    await this.roomsService.delete(payload.roomId, requesterUserId);

    const closedPayload = {
      roomId: payload.roomId,
      reason: "deleted_by_owner",
    };

    server.to(channel).emit("room:closed", this.response.ok(closedPayload));
    client.emit("room:deleted", this.response.ok(closedPayload));
    await this.broadcastRoomList(server);
  }

  // Demarre une partie dans une room.
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

  // Enregistre et diffuse un message de chat de room.
  async handleChatMessage(
    rawPayload: unknown,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const payload = this.validation.validatePayload(ChatMessageDto, rawPayload);
    const userId = this.presence.resolveSocketUser(client.id, payload.userId);
    await this.assertUserInRoom(payload.roomId, userId);
    const limitResult = this.rateLimit.consume(
      `chat:${userId}`,
      CHAT_MESSAGE_RATE_LIMITS,
    );

    if (!limitResult.allowed) {
      client.emit(
        "chat:message:error",
        this.response.fail(
          "TOO_MANY_REQUESTS",
          `Vous avez envoye trop de messages. Reessayez dans ${Math.ceil(limitResult.retryAfterMs / 1000)} secondes.`,
        ),
      );
      return;
    }

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

  // Verifie qu'un utilisateur appartient bien a la room.
  private async assertUserInRoom(roomId: number, userId: number) {
    const room = await this.roomsService.getById(roomId);
    if (!room.players.some((player) => player.userId === userId)) {
      throw new UnauthorizedException("User is not in this room");
    }
    return room;
  }

  // Diffuse la liste des rooms a tous les clients.
  private async broadcastRoomList(server: Server): Promise<void> {
    server.emit(
      "room:list-updated",
      this.response.ok(await this.roomsService.list()),
    );
  }

  // Genere le nom de canal Socket.IO d'une room.
  private roomChannel(roomId: number): string {
    return `room:${roomId}`;
  }
}
