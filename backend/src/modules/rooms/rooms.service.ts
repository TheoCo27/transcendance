import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";

export type RoomPlayer = {
  userId: number;
  joinedAt: string;
};

export type Room = {
  id: number;
  name: string;
  rounds: number;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: string;
  password?: string;
};

@Injectable()
export class RoomsService {
  private nextRoomId = 3;

  private readonly rooms: Room[] = [
    {
      id: 1,
      name: "Lobby #1",
      rounds: 5,
      isPrivate: false,
      status: "waiting",
      players: [{ userId: 1, joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Private room",
      rounds: 3,
      isPrivate: true,
      status: "waiting",
      players: [{ userId: 2, joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      password: "room1234",
    },
  ];

  list(): Array<Omit<Room, "password">> {
    return this.rooms.map((room) => this.stripPassword(room));
  }

  getById(roomId: number): Omit<Room, "password"> {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    return this.stripPassword(room);
  }

  create(dto: CreateRoomDto): Omit<Room, "password"> {
    const room: Room = {
      id: this.nextRoomId,
      name: dto.name,
      rounds: dto.rounds,
      isPrivate: dto.isPrivate ?? false,
      status: "waiting",
      players: [],
      createdAt: new Date().toISOString(),
      password: dto.password,
    };

    this.nextRoomId += 1;
    this.rooms.unshift(room);
    return this.stripPassword(room);
  }

  join(roomId: number, dto: JoinRoomDto): Omit<Room, "password"> {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
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

    return this.stripPassword(room);
  }

  leave(roomId: number, userId: number): Omit<Room, "password"> {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    room.players = room.players.filter((player) => player.userId !== userId);

    return this.stripPassword(room);
  }

  start(roomId: number): Omit<Room, "password"> {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    room.status = "playing";

    return this.stripPassword(room);
  }

  private stripPassword(room: Room): Omit<Room, "password"> {
    const { password, ...publicRoom } = room;
    return publicRoom;
  }
}
