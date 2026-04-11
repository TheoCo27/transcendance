import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";

export type RoomPlayer = {
  userId: number;
  joinedAt: string;
};

export type Room = {
  id: number;
  name: string;
  ownerUserId?: number;
  rounds: number;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  password?: string;
};

@Injectable()
export class RoomsService {
  private nextRoomId = 1;

  private readonly rooms: Room[] = [];

  list(): Array<Omit<Room, "password">> {
    return this.rooms.map((room) => this.stripPassword(room));
  }

  getById(roomId: number): Omit<Room, "password"> {
    const room = this.findRoomOrThrow(roomId);
    return this.stripPassword(room);
  }

  create(
    dto: CreateRoomDto & {
      ownerUserId?: number;
    },
  ): Omit<Room, "password"> {
    const createdAt = new Date().toISOString();
    const room: Room = {
      id: this.nextRoomId,
      name: dto.name,
      ownerUserId: dto.ownerUserId,
      rounds: dto.rounds,
      isPrivate: dto.isPrivate ?? false,
      status: "waiting",
      players:
        typeof dto.ownerUserId === "number"
          ? [{ userId: dto.ownerUserId, joinedAt: createdAt }]
          : [],
      createdAt,
      startedAt: null,
      finishedAt: null,
      password: dto.password,
    };

    this.nextRoomId += 1;
    this.rooms.unshift(room);
    return this.stripPassword(room);
  }

  join(roomId: number, dto: JoinRoomDto): Omit<Room, "password"> {
    const room = this.findRoomOrThrow(roomId);

    if (room.status !== "waiting") {
      throw new ConflictException("Room is not joinable");
    }

    if (room.isPrivate && room.password !== dto.password) {
      throw new UnauthorizedException("Invalid room password");
    }

    if (!room.players.some((player) => player.userId === dto.userId)) {
      room.players.push({
        userId: dto.userId,
        joinedAt: new Date().toISOString(),
      });
    }

    if (typeof room.ownerUserId !== "number") {
      room.ownerUserId = dto.userId;
    }

    return this.stripPassword(room);
  }

  leave(roomId: number, userId: number): Omit<Room, "password"> {
    const room = this.findRoomOrThrow(roomId);
    const existingPlayer = room.players.find((player) => player.userId === userId);

    if (!existingPlayer) {
      throw new ConflictException("User is not in this room");
    }

    room.players = room.players.filter((player) => player.userId !== userId);

    if (room.players.length === 0) {
      room.ownerUserId = undefined;
      return this.stripPassword(room);
    }

    if (room.ownerUserId === userId) {
      room.ownerUserId = room.players[0]?.userId;
    }

    return this.stripPassword(room);
  }

  start(roomId: number, requesterUserId: number): Omit<Room, "password"> {
    const room = this.findRoomOrThrow(roomId);

    if (room.status !== "waiting") {
      throw new ConflictException("Room is not in waiting state");
    }

    if (!room.players.some((player) => player.userId === requesterUserId)) {
      throw new UnauthorizedException("User is not in this room");
    }

    if (
      typeof room.ownerUserId === "number" &&
      room.ownerUserId !== requesterUserId
    ) {
      throw new UnauthorizedException("Only room owner can start the game");
    }

    if (room.players.length < 1) {
      throw new ConflictException("Cannot start a room without players");
    }

    room.status = "playing";
    room.startedAt = new Date().toISOString();
    room.finishedAt = null;

    return this.stripPassword(room);
  }

  finish(roomId: number): Omit<Room, "password"> {
    const room = this.findRoomOrThrow(roomId);

    if (room.status !== "playing") {
      throw new ConflictException("Room is not in playing state");
    }

    room.status = "finished";
    room.finishedAt = new Date().toISOString();

    return this.stripPassword(room);
  }

  close(roomId: number): { roomId: number } {
    const index = this.rooms.findIndex((room) => room.id === roomId);
    if (index === -1) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const room = this.rooms[index];
    if (room.status === "playing") {
      throw new ConflictException("Cannot close a room while game is playing");
    }

    this.rooms.splice(index, 1);

    return { roomId };
  }

  private stripPassword(room: Room): Omit<Room, "password"> {
    const { password, ...publicRoom } = room;
    return publicRoom;
  }

  private findRoomOrThrow(roomId: number): Room {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    return room;
  }
}
