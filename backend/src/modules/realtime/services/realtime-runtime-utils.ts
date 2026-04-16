import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { Server } from "socket.io";
import { RealtimeResponseService } from "./realtime-response.service";

export function roomChannel(roomId: number): string {
  return `room:${roomId}`;
}

export function getQuestionIdForTurn(
  gameService: GameService,
  roomId: number,
  turnNumber: number,
): number {
  return gameService.getQuestionIdForTurn(roomId, turnNumber);
}

export async function broadcastRoomList(
  server: Server,
  roomsService: RoomsService,
  response: RealtimeResponseService,
): Promise<void> {
  server.emit("room:list-updated", response.ok(await roomsService.list()));
}
