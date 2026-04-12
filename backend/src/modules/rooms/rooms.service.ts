import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
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
  quizId: number | null;
  rounds: number;
  questionDurationMs: number | null;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  password?: string;
};

type RoomsStore = {
  nextRoomId: number;
  rooms: Room[];
};

@Injectable()
export class RoomsService {
  private readonly storeFilePath = path.resolve(process.cwd(), ".runtime/rooms-store.json");

  private nextRoomId = 1;

  private rooms: Room[] = [];

  constructor() {
    this.loadStore();
  }

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
      quizId: dto.quizId ?? null,
      rounds: dto.rounds,
      questionDurationMs:
        typeof dto.questionDurationSec === "number"
          ? dto.questionDurationSec * 1000
          : dto.questionDurationSec === null
            ? null
            : Number(process.env.GAME_QUESTION_DURATION_MS || 10000),
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
    this.persistStore();
    return this.stripPassword(room);
  }

  listByQuizId(quizId: number): Array<Omit<Room, "password">> {
    return this.rooms
      .filter((room) => room.quizId === quizId)
      .map((room) => this.stripPassword(room));
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

    this.persistStore();
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
      this.persistStore();
      return this.stripPassword(room);
    }

    if (room.ownerUserId === userId) {
      room.ownerUserId = room.players[0]?.userId;
    }

    this.persistStore();
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

    this.persistStore();
    return this.stripPassword(room);
  }

  finish(roomId: number): Omit<Room, "password"> {
    const room = this.findRoomOrThrow(roomId);

    if (room.status !== "playing") {
      throw new ConflictException("Room is not in playing state");
    }

    room.status = "finished";
    room.finishedAt = new Date().toISOString();

    this.persistStore();
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
    this.persistStore();

    return { roomId };
  }

  private loadStore(): void {
    if (!existsSync(this.storeFilePath)) {
      return;
    }

    try {
      const rawStore = JSON.parse(readFileSync(this.storeFilePath, "utf8")) as Partial<RoomsStore>;
      const rooms = Array.isArray(rawStore.rooms)
        ? rawStore.rooms.map((room) => this.normalizeRoom(room))
        : [];
      const highestRoomId = rooms.reduce(
        (currentMax, room) => Math.max(currentMax, room.id),
        0,
      );

      this.rooms = rooms.sort((left, right) => right.id - left.id);
      this.nextRoomId = Math.max(
        1,
        typeof rawStore.nextRoomId === "number"
          ? rawStore.nextRoomId
          : highestRoomId + 1,
      );
    } catch {
      this.rooms = [];
      this.nextRoomId = 1;
    }
  }

  private persistStore(): void {
    const directory = path.dirname(this.storeFilePath);
    mkdirSync(directory, { recursive: true });

    const payload: RoomsStore = {
      nextRoomId: this.nextRoomId,
      rooms: this.rooms,
    };
    const temporaryFilePath = `${this.storeFilePath}.tmp`;

    writeFileSync(temporaryFilePath, JSON.stringify(payload, null, 2), "utf8");
    renameSync(temporaryFilePath, this.storeFilePath);
  }

  private stripPassword(room: Room): Omit<Room, "password"> {
    const { password, ...publicRoom } = room;
    return publicRoom;
  }

  private normalizeRoom(value: unknown): Room {
    const room = value as Partial<Room>;
    const createdAt =
      typeof room.createdAt === "string" ? room.createdAt : new Date().toISOString();

    return {
      id: typeof room.id === "number" ? room.id : this.nextRoomId,
      name: typeof room.name === "string" ? room.name : "Room",
      ownerUserId: typeof room.ownerUserId === "number" ? room.ownerUserId : undefined,
      quizId: typeof room.quizId === "number" ? room.quizId : null,
      rounds: typeof room.rounds === "number" ? room.rounds : 1,
      questionDurationMs:
        typeof room.questionDurationMs === "number" || room.questionDurationMs === null
          ? room.questionDurationMs
          : Number(process.env.GAME_QUESTION_DURATION_MS || 10000),
      isPrivate: room.isPrivate === true,
      status:
        room.status === "playing" || room.status === "finished" ? room.status : "waiting",
      players: Array.isArray(room.players)
        ? room.players
            .filter(
              (player): player is RoomPlayer =>
                typeof player?.userId === "number" &&
                typeof player?.joinedAt === "string",
            )
            .sort(
              (left, right) =>
                new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime(),
            )
        : [],
      createdAt,
      startedAt: typeof room.startedAt === "string" ? room.startedAt : null,
      finishedAt: typeof room.finishedAt === "string" ? room.finishedAt : null,
      password: typeof room.password === "string" ? room.password : undefined,
    };
  }

  private findRoomOrThrow(roomId: number): Room {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    return room;
  }
}
