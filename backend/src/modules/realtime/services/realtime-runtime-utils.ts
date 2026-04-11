import { GameService } from "@/modules/game/game.service";
import { RoomsService } from "@/modules/rooms/rooms.service";
import { ConflictException } from "@nestjs/common";
import { Server } from "socket.io";
import { RealtimeResponseService } from "./realtime-response.service";

export function roomChannel(roomId: number): string {
  return `room:${roomId}`;
}

export function getQuestionIdForTurn(
  gameService: GameService,
  turnNumber: number,
): number {
  const questionOrder = gameService.getQuestionOrder();
  if (questionOrder.length === 0) {
    throw new ConflictException("No questions configured");
  }
  return questionOrder[(turnNumber - 1) % questionOrder.length];
}

export function broadcastRoomList(
  server: Server,
  roomsService: RoomsService,
  response: RealtimeResponseService,
): void {
  server.emit("room:list-updated", response.ok(roomsService.list()));
}

