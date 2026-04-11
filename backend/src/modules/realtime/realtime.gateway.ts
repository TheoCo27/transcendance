import { Logger, OnModuleDestroy } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RealtimeAuthService } from "./services/realtime-auth.service";
import { RealtimeGameEventsService } from "./services/realtime-game-events.service";
import { RealtimeGameRuntimeService } from "./services/realtime-game-runtime.service";
import { RealtimePresenceService } from "./services/realtime-presence.service";
import { RealtimeResponseService } from "./services/realtime-response.service";
import { RealtimeRoomEventsService } from "./services/realtime-room-events.service";

@WebSocketGateway({
  namespace: "/ws",
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "https://localhost:3000",
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: RealtimeAuthService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly roomEvents: RealtimeRoomEventsService,
    private readonly gameEvents: RealtimeGameEventsService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.auth.authenticateSocket(client);
      this.presence.bindSocketToUser(client.id, userId);

      client.emit(
        "ws:connected",
        this.response.ok({
          socketId: client.id,
          userId,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication required";

      client.emit(
        "ws:auth:error",
        this.response.fail("UNAUTHORIZED", message),
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.roomEvents.handleDisconnect(client.id, this.server);
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  onModuleDestroy(): void {
    this.gameRuntime.stopAllTimers();
    this.presence.clear();
  }

  @SubscribeMessage("room:list")
  handleRoomList(@ConnectedSocket() client: Socket): void {
    this.runSafely(client, "room:list:error", () => {
      this.roomEvents.handleRoomList(client);
    });
  }

  @SubscribeMessage("room:create")
  handleRoomCreate(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    this.runSafely(client, "room:create:error", () => {
      this.roomEvents.handleRoomCreate(payload, client, this.server);
    });
  }

  @SubscribeMessage("room:join")
  handleRoomJoin(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    this.runSafely(client, "room:join:error", () => {
      this.roomEvents.handleRoomJoin(payload, client, this.server);
    });
  }

  @SubscribeMessage("room:leave")
  handleRoomLeave(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    this.runSafely(client, "room:leave:error", () => {
      this.roomEvents.handleRoomLeave(payload, client, this.server);
    });
  }

  @SubscribeMessage("room:start")
  handleRoomStart(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    this.runSafely(client, "room:start:error", () => {
      this.roomEvents.handleRoomStart(payload, client, this.server);
    });
  }

  @SubscribeMessage("game:answer")
  handleGameAnswer(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    this.runSafely(client, "game:answer:error", () => {
      this.gameEvents.handleGameAnswer(payload, client, this.server);
    });
  }

  @SubscribeMessage("chat:message")
  handleChatMessage(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): void {
    this.runSafely(client, "chat:message:error", () => {
      this.roomEvents.handleChatMessage(payload, client, this.server);
    });
  }

  private runSafely(
    client: Socket,
    errorEvent: string,
    callback: () => void,
  ): void {
    try {
      callback();
    } catch (exception) {
      this.response.emitError(client, errorEvent, exception);
    }
  }
}
