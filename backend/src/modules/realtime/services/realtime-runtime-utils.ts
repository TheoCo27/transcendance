// Ce fichier regroupe de petits helpers reutilisables par le runtime temps reel.
import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { Server } from "socket.io";
import { RealtimeResponseService } from "./realtime-response.service";

// Construit le nom de channel Socket.IO utilise pour diffuser a une room.
export function roomChannel(roomId: number): string {
  return `room:${roomId}`;
}

// Delegue au moteur de jeu la resolution de la question correspondant a un tour donne.
export function getQuestionIdForTurn(
  gameService: GameService,
  roomId: number,
  turnNumber: number,
): number {
  return gameService.getQuestionIdForTurn(roomId, turnNumber);
}

// Rediffuse a tous les clients la liste publique des rooms courantes.
export async function broadcastRoomList(
  server: Server,
  roomsService: RoomsService,
  response: RealtimeResponseService,
): Promise<void> {
  server.emit("room:list-updated", response.ok(await roomsService.list()));
}
