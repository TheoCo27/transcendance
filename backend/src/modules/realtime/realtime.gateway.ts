// Ce fichier declare la gateway Socket.IO principale du projet.
// Elle recoit les evenements temps reel et les delegue aux services metier.
import { Logger, OnModuleDestroy } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RealtimeAuthService } from "./services/realtime-auth.service";
import { RealtimeBroadcastService } from "./services/realtime-broadcast.service";
import { RealtimeGameEventsService } from "./services/realtime-game-events.service";
import { RealtimeGameRuntimeService } from "./services/realtime-game-runtime.service";
import { RealtimePresenceService } from "./services/realtime-presence.service";
import { RealtimeResponseService } from "./services/realtime-response.service";
import { RealtimeRoomEventsService } from "./services/realtime-room-events.service";

const WS_HEARTBEAT_INTERVAL_MS = 5_000;
const WS_HEARTBEAT_TIMEOUT_MS = 10_000;

@WebSocketGateway({
  namespace: "/ws",
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "https://localhost:3000",
    credentials: true,
  },
  pingInterval: WS_HEARTBEAT_INTERVAL_MS,
  pingTimeout: WS_HEARTBEAT_TIMEOUT_MS,
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  // Logger de la gateway pour tracer les connexions/deconnexions.
  private readonly logger = new Logger(RealtimeGateway.name);

  // Instance Socket.IO serveur fournie par NestJS.
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: RealtimeAuthService,
    private readonly broadcast: RealtimeBroadcastService,
    private readonly response: RealtimeResponseService,
    private readonly presence: RealtimePresenceService,
    private readonly roomEvents: RealtimeRoomEventsService,
    private readonly gameEvents: RealtimeGameEventsService,
    private readonly gameRuntime: RealtimeGameRuntimeService,
  ) {}

  // Partage l'instance Socket.IO avec les services hors gateway.
  afterInit(server: Server): void {
    this.broadcast.setServer(server);
  }

  // Gere l'ouverture d'un socket: auth, liaison user/socket et synchro des rooms.
  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.auth.authenticateSocket(client);
      await this.presence.bindSocketToUser(client.id, userId);
      await this.roomEvents.syncSocketRoomMembership(userId, client);

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

      client.emit("ws:auth:error", this.response.fail("UNAUTHORIZED", message));
      client.disconnect(true);
    }
  }

  // Gere la deconnexion d'un socket et le nettoyage associe.
  async handleDisconnect(client: Socket): Promise<void> {
    await this.roomEvents.handleDisconnect(client.id, this.server);
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  // Nettoie les timers et l'etat de presence quand le module est detruit.
  onModuleDestroy(): void {
    this.gameRuntime.stopAllTimers();
    this.roomEvents.clearDisconnectCleanupTimers();
    this.presence.clear();
  }

  // Retourne la liste des rooms au client demandeur.
  @SubscribeMessage("room:list")
  async handleRoomList(@ConnectedSocket() client: Socket): Promise<void> {
    await this.runSafely(client, "room:list:error", async () => {
      await this.roomEvents.handleRoomList(client);
    });
  }

  // Traite la creation temps reel d'une room.
  @SubscribeMessage("room:create")
  async handleRoomCreate(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "room:create:error", async () => {
      await this.roomEvents.handleRoomCreate(payload, client, this.server);
    });
  }

  // Traite la demande de rejoindre une room.
  @SubscribeMessage("room:join")
  async handleRoomJoin(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "room:join:error", async () => {
      await this.roomEvents.handleRoomJoin(payload, client, this.server);
    });
  }

  // Traite la sortie volontaire d'un joueur hors de la room.
  @SubscribeMessage("room:leave")
  async handleRoomLeave(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "room:leave:error", async () => {
      await this.roomEvents.handleRoomLeave(payload, client, this.server);
    });
  }

  // Recharge l'historique du chat pour une room deja rejointe.
  @SubscribeMessage("chat:history:request")
  async handleChatHistoryRequest(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "chat:history:error", async () => {
      await this.roomEvents.handleChatHistoryRequest(payload, client);
    });
  }

  // Traite la suppression d'une room par son proprietaire.
  @SubscribeMessage("room:delete")
  async handleRoomDelete(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "room:delete:error", async () => {
      await this.roomEvents.handleRoomDelete(payload, client, this.server);
    });
  }

  // Traite le lancement d'une partie depuis la room.
  @SubscribeMessage("room:start")
  async handleRoomStart(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "room:start:error", async () => {
      await this.roomEvents.handleRoomStart(payload, client, this.server);
    });
  }

  // Traite l'envoi d'une reponse pour la question active.
  @SubscribeMessage("game:answer")
  async handleGameAnswer(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "game:answer:error", async () => {
      await this.gameEvents.handleGameAnswer(payload, client, this.server);
    });
  }

  // Traite l'envoi d'un message de chat temps reel.
  @SubscribeMessage("chat:message")
  async handleChatMessage(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.runSafely(client, "chat:message:error", async () => {
      await this.roomEvents.handleChatMessage(payload, client, this.server);
    });
  }

  // Encapsule les handlers WS pour renvoyer un event d'erreur coherent en cas d'exception.
  private async runSafely(
    client: Socket,
    errorEvent: string,
    callback: () => Promise<void>,
  ): Promise<void> {
    try {
      await callback();
    } catch (exception) {
      this.response.emitError(client, errorEvent, exception);
    }
  }
}
