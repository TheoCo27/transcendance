import { SubmitAnswerDto } from "@/modules/game/dto/submit-answer.dto";
import { GameService } from "@/modules/game/game.service";
import { CreateRoomDto } from "@/modules/rooms/dto/create-room.dto";
import { JoinRoomDto } from "@/modules/rooms/dto/join-room.dto";
import { Room, RoomsService } from "@/modules/rooms/rooms.service";
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleDestroy,
} from "@nestjs/common";
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

type RoomTimerRuntime = {
  roomId: number;
  questionId: number;
  questionNumber: number;
  totalQuestions: number;
  endsAtMs: number;
  tickInterval: NodeJS.Timeout;
  endTimeout: NodeJS.Timeout;
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
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly activeTimers = new Map<number, RoomTimerRuntime>();
  private readonly questionDurationMs = Number(
    process.env.GAME_QUESTION_DURATION_MS || 10000,
  );
  private readonly timerTickMs = 1000;

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

  onModuleDestroy(): void {
    for (const roomId of this.activeTimers.keys()) {
      this.stopRoomTimer(roomId);
    }
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
      const channel = this.roomChannel(payload.roomId);

      client.leave(channel);
      client.emit(
        "room:left",
        this.ok({
          roomId: payload.roomId,
          userId: payload.userId,
        }),
      );

      if (room.players.length === 0) {
        const closed = this.closeRoom(payload.roomId, "room_empty");
        client.emit("room:closed", this.ok(closed));
        return;
      }

      this.server.to(channel).emit("room:state", this.ok(room));
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
      this.stopRoomTimer(payload.roomId);

      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("room:started", this.ok(room));
      this.startGameLoop(payload.roomId, room.rounds);
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
      const room = this.roomsService.getById(payload.roomId);
      if (room.status !== "playing") {
        throw new ConflictException("Game is not running for this room");
      }

      const runtime = this.activeTimers.get(payload.roomId);
      if (!runtime) {
        throw new ConflictException("No active question timer");
      }

      if (payload.questionId !== runtime.questionId) {
        throw new ConflictException("Question is not active");
      }

      const answer = this.gameService.submitAnswer(payload);
      const gameState = this.gameService.getRoomState(payload.roomId);
      const leaderboard = this.gameService.getRoomLeaderboard(payload.roomId);

      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("game:answer:result", this.ok(answer));
      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("game:state", this.ok(gameState));
      this.server
        .to(this.roomChannel(payload.roomId))
        .emit("game:leaderboard", this.ok(leaderboard));
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

  private startGameLoop(roomId: number, roomRounds: number): void {
    const totalQuestions = Math.max(1, roomRounds);

    this.server.to(this.roomChannel(roomId)).emit(
      "game:started",
      this.ok({
        roomId,
        totalQuestions,
        questionDurationMs: this.questionDurationMs,
      }),
    );

    this.startQuestionTimer(roomId, 1, totalQuestions);
  }

  private startQuestionTimer(
    roomId: number,
    questionNumber: number,
    totalQuestions: number,
  ): void {
    this.stopRoomTimer(roomId);

    const questionId = this.getQuestionIdForTurn(questionNumber);
    const startsAtMs = Date.now();
    const endsAtMs = startsAtMs + this.questionDurationMs;
    const startsAt = new Date(startsAtMs).toISOString();
    const endsAt = new Date(endsAtMs).toISOString();

    const state = this.gameService.setCurrentQuestion(roomId, questionId);
    const channel = this.roomChannel(roomId);

    this.server.to(channel).emit(
      "game:question:started",
      this.ok({
        roomId,
        questionId,
        questionNumber,
        totalQuestions,
        durationMs: this.questionDurationMs,
        startsAt,
        endsAt,
      }),
    );
    this.server.to(channel).emit("game:state", this.ok(state));

    this.emitTimerTick(roomId, questionId, questionNumber, totalQuestions, endsAtMs);

    const tickInterval = setInterval(() => {
      this.emitTimerTick(
        roomId,
        questionId,
        questionNumber,
        totalQuestions,
        endsAtMs,
      );
    }, this.timerTickMs);

    const endTimeout = setTimeout(() => {
      this.onQuestionTimeout(roomId);
    }, this.questionDurationMs);

    this.activeTimers.set(roomId, {
      roomId,
      questionId,
      questionNumber,
      totalQuestions,
      endsAtMs,
      tickInterval,
      endTimeout,
    });
  }

  private emitTimerTick(
    roomId: number,
    questionId: number,
    questionNumber: number,
    totalQuestions: number,
    endsAtMs: number,
  ): void {
    const remainingMs = Math.max(0, endsAtMs - Date.now());
    this.server.to(this.roomChannel(roomId)).emit(
      "game:timer",
      this.ok({
        roomId,
        questionId,
        questionNumber,
        totalQuestions,
        remainingMs,
        endsAt: new Date(endsAtMs).toISOString(),
      }),
    );
  }

  private onQuestionTimeout(roomId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      return;
    }

    this.stopRoomTimer(roomId);

    this.server.to(this.roomChannel(roomId)).emit(
      "game:question:timeout",
      this.ok({
        roomId: runtime.roomId,
        questionId: runtime.questionId,
        questionNumber: runtime.questionNumber,
        totalQuestions: runtime.totalQuestions,
      }),
    );

    if (runtime.questionNumber >= runtime.totalQuestions) {
      this.endGame(roomId, "timer_completed");
      return;
    }

    this.startQuestionTimer(
      roomId,
      runtime.questionNumber + 1,
      runtime.totalQuestions,
    );
  }

  private endGame(roomId: number, reason: string): void {
    this.stopRoomTimer(roomId);
    const leaderboard = this.gameService.getRoomLeaderboard(roomId);
    const winnerUserId = leaderboard.length > 0 ? leaderboard[0].userId : null;
    const room = this.roomsService.finish(roomId);

    this.server.to(this.roomChannel(roomId)).emit("room:state", this.ok(room));
    this.server
      .to(this.roomChannel(roomId))
      .emit("game:leaderboard", this.ok(leaderboard));
    this.server.to(this.roomChannel(roomId)).emit(
      "game:ended",
      this.ok({
        roomId,
        reason,
        winnerUserId,
        leaderboard,
      }),
    );
    this.broadcastRoomList();
    this.gameService.clearRoomState(roomId);
  }

  private stopRoomTimer(roomId: number): void {
    const runtime = this.activeTimers.get(roomId);
    if (!runtime) {
      return;
    }

    clearInterval(runtime.tickInterval);
    clearTimeout(runtime.endTimeout);
    this.activeTimers.delete(roomId);
  }

  private getQuestionIdForTurn(turnNumber: number): number {
    const questionOrder = this.gameService.getQuestionOrder();
    if (questionOrder.length === 0) {
      throw new ConflictException("No questions configured");
    }

    const index = (turnNumber - 1) % questionOrder.length;
    return questionOrder[index];
  }

  private closeRoom(roomId: number, reason: string): { roomId: number; reason: string } {
    const channel = this.roomChannel(roomId);
    const room = this.roomsService.getById(roomId);
    if (room.status === "playing") {
      this.endGame(roomId, reason);
    }

    const closed = this.roomsService.close(roomId);
    this.gameService.clearRoomState(roomId);
    this.stopRoomTimer(roomId);
    const closePayload = {
      ...closed,
      reason,
    };

    this.server.to(channel).emit(
      "room:closed",
      this.ok(closePayload),
    );
    this.broadcastRoomList();
    return closePayload;
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
