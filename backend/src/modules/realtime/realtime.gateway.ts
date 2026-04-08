import { SubmitAnswerDto } from "@/modules/game/dto/submit-answer.dto";
import { GameService } from "@/modules/game/game.service";
import { CreateRoomDto } from "@/modules/rooms/dto/create-room.dto";
import { JoinRoomDto } from "@/modules/rooms/dto/join-room.dto";
import { Room, RoomsService } from "@/modules/rooms/rooms.service";
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
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

type WsErrorPayload = {
  code: string;
  message: string;
};

type WsResponse<T> =
  | {
      success: true;
      data: T;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: WsErrorPayload;
    };

type RoomCreatePayload = CreateRoomDto & {
  userId?: number;
};

type RoomJoinPayload = JoinRoomDto & {
  roomId: number;
};

type RoomLeavePayload = {
  roomId: number;
  userId: number;
};

type RoomStartPayload = {
  roomId: number;
};

type ChatMessagePayload = {
  roomId: number;
  userId: number;
  content: string;
};

@WebSocketGateway({
  namespace: "/ws",
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  handleConnection(client: Socket): void {
    client.emit(
      "ws:connected",
      this.ok({
        socketId: client.id,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("room:list")
  handleRoomList(@ConnectedSocket() client: Socket): void {
    client.emit("room:list", this.ok(this.roomsService.list()));
  }

  @SubscribeMessage("room:create")
  handleRoomCreate(
    @MessageBody() payload: RoomCreatePayload,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const created = this.roomsService.create(payload);

      const room =
        typeof payload.userId === "number" && payload.userId > 0
          ? this.roomsService.join(created.id, {
              userId: payload.userId,
              password: payload.password,
            })
          : created;

      client.join(this.roomChannel(room.id));
      client.emit("room:created", this.ok(room));
      this.server.to(this.roomChannel(room.id)).emit("room:state", this.ok(room));
      this.broadcastRoomList();
    } catch (exception) {
      this.emitError(client, "room:create:error", exception);
    }
  }

  @SubscribeMessage("room:join")
  handleRoomJoin(
    @MessageBody() payload: RoomJoinPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const room = this.roomsService.join(payload.roomId, {
        userId: payload.userId,
        password: payload.password,
      });

      client.join(this.roomChannel(payload.roomId));
      client.emit("room:joined", this.ok(room));
      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("room:state", this.ok(room));
      this.broadcastRoomList();
    } catch (exception) {
      this.emitError(client, "room:join:error", exception);
    }
  }

  @SubscribeMessage("room:leave")
  handleRoomLeave(
    @MessageBody() payload: RoomLeavePayload,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const room = this.roomsService.leave(payload.roomId, payload.userId);

      client.leave(this.roomChannel(payload.roomId));
      client.emit(
        "room:left",
        this.ok({
          roomId: payload.roomId,
          userId: payload.userId,
        }),
      );
      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("room:state", this.ok(room));
      this.broadcastRoomList();
    } catch (exception) {
      this.emitError(client, "room:leave:error", exception);
    }
  }

  @SubscribeMessage("room:start")
  handleRoomStart(
    @MessageBody() payload: RoomStartPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const room = this.roomsService.start(payload.roomId);
      const gameState = this.gameService.getRoomState(payload.roomId);

      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("room:started", this.ok(room));
      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("game:state", this.ok(gameState));
      this.broadcastRoomList();
    } catch (exception) {
      this.emitError(client, "room:start:error", exception);
    }
  }

  @SubscribeMessage("game:answer")
  handleGameAnswer(
    @MessageBody() payload: SubmitAnswerDto,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const answer = this.gameService.submitAnswer(payload);
      const gameState = this.gameService.getRoomState(payload.roomId);

      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("game:answer:result", this.ok(answer));
      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("game:state", this.ok(gameState));
    } catch (exception) {
      this.emitError(client, "game:answer:error", exception);
    }
  }

  @SubscribeMessage("chat:message")
  handleChatMessage(
    @MessageBody() payload: ChatMessagePayload,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      this.roomsService.getById(payload.roomId);

      const content = payload.content?.trim();
      if (!content) {
        client.emit(
          "chat:message:error",
          this.fail("BAD_REQUEST", "Message content is required"),
        );
        return;
      }

      this.server.to(this.roomChannel(payload.roomId)).emit(
        "chat:message",
        this.ok({
          roomId: payload.roomId,
          userId: payload.userId,
          content,
          sentAt: new Date().toISOString(),
        }),
      );
    } catch (exception) {
      this.emitError(client, "chat:message:error", exception);
    }
  }

  private roomChannel(roomId: number): string {
    return `room:${roomId}`;
  }

  private broadcastRoomList(): void {
    this.server.emit("room:list-updated", this.ok(this.roomsService.list()));
  }

  private ok<T>(data: T): WsResponse<T> {
    return {
      success: true,
      data,
      error: null,
    };
  }

  private fail(code: string, message: string): WsResponse<never> {
    return {
      success: false,
      data: null,
      error: { code, message },
    };
  }

  private emitError(
    client: Socket,
    event: string,
    exception: unknown,
  ): void {
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : "Unhandled exception",
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const status = this.getStatus(exception);
    const code = this.getErrorCode(status);
    const message = this.getErrorMessage(exception);

    client.emit(event, this.fail(code, message));
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorCode(status: number): string {
    const maybeCode = HttpStatus[status];
    return typeof maybeCode === "string"
      ? maybeCode
      : "INTERNAL_SERVER_ERROR";
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === "string") {
        return response;
      }

      if (typeof response === "object" && response !== null) {
        const value = (response as { message?: unknown }).message;
        if (Array.isArray(value)) {
          return value.join(", ");
        }
        if (typeof value === "string" && value.length > 0) {
          return value;
        }
      }

      return exception.message;
    }

    return "Internal server error";
  }
}

