import { PrismaService } from "@/prisma/prisma.service";
import {
  BadRequestException,
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
  ownerUserId: number;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  gameType: "wordle" | "memory" | null;
  gameConfig: unknown | null;
  players: RoomPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  password?: string;
};

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Array<Omit<Room, "password">>> {
    const rooms = await this.prisma.client.room.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        players: {
          select: {
            userId: true,
            joinedAt: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    return rooms.map((room) => this.stripPassword(this.toRoom(room)));
  }

  async getById(roomId: number): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);
    return this.stripPassword(this.toRoom(room));
  }

  async create(
    dto: CreateRoomDto & {
      ownerUserId?: number;
    },
  ): Promise<Omit<Room, "password">> {
    if (typeof dto.ownerUserId !== "number") {
      throw new BadRequestException("ownerUserId is required to create a room");
    }

    const room = await this.prisma.client.room.create({
      data: {
        name: dto.name,
        ownerId: dto.ownerUserId,
        status: "waiting",
        isPrivate: dto.isPrivate ?? false,
        password: dto.password,
        players: {
          create: {
            userId: dto.ownerUserId,
          },
        },
      },
      include: {
        players: {
          select: {
            userId: true,
            joinedAt: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    return this.stripPassword(this.toRoom(room));
  }

  async join(
    roomId: number,
    dto: JoinRoomDto,
  ): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status !== "waiting") {
      throw new ConflictException("Room is not joinable");
    }

    if (room.isPrivate && room.password !== dto.password) {
      throw new UnauthorizedException("Invalid room password");
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.roomPlayer.upsert({
        where: {
          userId_roomId: {
            userId: dto.userId,
            roomId,
          },
        },
        update: {},
        create: {
          roomId,
          userId: dto.userId,
        },
      });

      if (room.ownerId !== dto.userId) {
        const hasOwnerPlayer = await tx.roomPlayer.findUnique({
          where: {
            userId_roomId: {
              userId: room.ownerId,
              roomId,
            },
          },
          select: {
            userId: true,
          },
        });

        if (!hasOwnerPlayer) {
          await tx.room.update({
            where: { id: roomId },
            data: { ownerId: dto.userId },
          });
        }
      }
    });

    return this.getById(roomId);
  }

  async leave(roomId: number, userId: number): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);
    const existingPlayer = await this.prisma.client.roomPlayer.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!existingPlayer) {
      throw new ConflictException("User is not in this room");
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.roomPlayer.delete({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      });

      if (room.ownerId === userId) {
        const nextOwner = await tx.roomPlayer.findFirst({
          where: { roomId },
          orderBy: { joinedAt: "asc" },
          select: { userId: true },
        });

        if (nextOwner) {
          await tx.room.update({
            where: { id: roomId },
            data: { ownerId: nextOwner.userId },
          });
        }
      }
    });

    return this.getById(roomId);
  }

  async start(
    roomId: number,
    requesterUserId: number,
  ): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status !== "waiting") {
      throw new ConflictException("Room is not in waiting state");
    }

    const isPlayer = await this.prisma.client.roomPlayer.findUnique({
      where: {
        userId_roomId: {
          userId: requesterUserId,
          roomId,
        },
      },
      select: { userId: true },
    });

    if (!isPlayer) {
      throw new UnauthorizedException("User is not in this room");
    }

    if (room.ownerId !== requesterUserId) {
      throw new UnauthorizedException("Only room owner can start the game");
    }

    const playerCount = await this.prisma.client.roomPlayer.count({
      where: { roomId },
    });

    if (playerCount < 1) {
      throw new ConflictException("Cannot start a room without players");
    }

    await this.prisma.client.room.update({
      where: { id: roomId },
      data: {
        status: "playing",
        startedAt: new Date(),
        finishedAt: null,
      },
    });

    return this.getById(roomId);
  }

  async finish(roomId: number): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status !== "playing") {
      throw new ConflictException("Room is not in playing state");
    }

    await this.prisma.client.room.update({
      where: { id: roomId },
      data: {
        status: "finished",
        finishedAt: new Date(),
      },
    });

    return this.getById(roomId);
  }

  async close(roomId: number): Promise<{ roomId: number }> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status === "playing") {
      throw new ConflictException("Cannot close a room while game is playing");
    }

    const playerCount = await this.prisma.client.roomPlayer.count({
      where: { roomId },
    });
    if (playerCount > 0) {
      throw new ConflictException("Cannot close a room with active players");
    }

    await this.prisma.client.room.delete({
      where: { id: roomId },
    });

    return { roomId };
  }

  private stripPassword(room: Room): Omit<Room, "password"> {
    const { password, ...publicRoom } = room;
    return publicRoom;
  }

  private async findRoomOrThrow(roomId: number) {
    const room = await this.prisma.client.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          select: {
            userId: true,
            joinedAt: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    return room;
  }

  private toRoom(room: {
    id: number;
    name: string;
    ownerId: number;
    status: "waiting" | "playing" | "finished";
    gameType: "wordle" | "memory" | null;
    gameConfig: unknown;
    isPrivate: boolean;
    password: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    players: Array<{ userId: number; joinedAt: Date }>;
  }): Room {
    return {
      id: room.id,
      name: room.name,
      ownerUserId: room.ownerId,
      status: room.status,
      gameType: room.gameType,
      gameConfig: room.gameConfig,
      isPrivate: room.isPrivate,
      password: room.password ?? undefined,
      players: room.players.map((player) => ({
        userId: player.userId,
        joinedAt: player.joinedAt.toISOString(),
      })),
      createdAt: room.createdAt.toISOString(),
      startedAt: room.startedAt?.toISOString() ?? null,
      finishedAt: room.finishedAt?.toISOString() ?? null,
    };
  }
}
