// Ce fichier centralise les diffusions Socket.IO partagees
// entre le temps reel et certains flux HTTP.
import { RoomsService } from "@/modules/rooms/rooms.service";
import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { RealtimeResponseService } from "./realtime-response.service";

@Injectable()
export class RealtimeBroadcastService {
  private server: Server | null = null;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly response: RealtimeResponseService,
  ) {}

  // Memorise l'instance Socket.IO pour les diffusions hors gateway.
  setServer(server: Server): void {
    this.server = server;
  }

  // Rediffuse la liste courante des rooms a tous les clients connectes.
  async broadcastRoomList(): Promise<void> {
    if (!this.server) {
      return;
    }

    this.server.emit(
      "room:list-updated",
      this.response.ok(await this.roomsService.list()),
    );
  }
}
