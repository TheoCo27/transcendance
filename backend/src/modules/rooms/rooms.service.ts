import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@generated/prisma/client";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CreateRoomDto } from "./dto/create-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";

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

  async update(
    roomId: number,
    requesterUserId: number,
    dto: UpdateRoomDto,
  ): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.ownerId !== requesterUserId) {
      throw new UnauthorizedException("Only room owner can update room config");
    }

    if (room.status !== "waiting") {
      throw new ConflictException("Room can only be configured while waiting");
    }

    const updateData: Prisma.RoomUpdateInput = {};

    if (typeof dto.name === "string") {
      updateData.name = dto.name;
    }

    if (typeof dto.gameType === "string") {
      updateData.gameType = dto.gameType;
      updateData.gameConfig = Prisma.JsonNull;
    }

    if (typeof dto.gameConfig === "object" && dto.gameConfig !== null) {
      updateData.gameConfig = dto.gameConfig as Prisma.InputJsonValue;
    }

    if (typeof dto.isPrivate === "boolean") {
      updateData.isPrivate = dto.isPrivate;
      if (!dto.isPrivate) {
        updateData.password = null;
      }
    }

    if (typeof dto.password === "string") {
      const isPrivate =
        typeof dto.isPrivate === "boolean" ? dto.isPrivate : room.isPrivate;
      if (!isPrivate) {
        throw new BadRequestException(
          "Password can only be set for private rooms",
        );
      }

      updateData.password = dto.password;
    }

    if (
      (typeof dto.isPrivate === "boolean" && dto.isPrivate) ||
      (room.isPrivate && typeof dto.isPrivate !== "boolean")
    ) {
      const resolvedPassword =
        typeof dto.password === "string" ? dto.password : (room.password ?? "");
      if (resolvedPassword.length < 4) {
        throw new BadRequestException("Private rooms require a password");
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(roomId);
    }

    await this.prisma.client.room.update({
      where: { id: roomId },
      data: updateData,
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

    this.assertStartConfiguration(room);

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

  private assertStartConfiguration(room: {
    gameType: "wordle" | "memory" | null;
    gameConfig: unknown;
  }): void {
    if (!room.gameType) {
      throw new ConflictException(
        "Room game type must be configured before start",
      );
    }

    if (!this.isObjectRecord(room.gameConfig)) {
      throw new ConflictException(
        "Room game configuration is required before start",
      );
    }

    if (room.gameType === "wordle") {
      const wordLength = room.gameConfig.wordLength;
      const maxAttempts = room.gameConfig.maxAttempts;

      if (
        typeof wordLength !== "number" ||
        !Number.isInteger(wordLength) ||
        wordLength < 4 ||
        wordLength > 8
      ) {
        throw new ConflictException(
          "Wordle config requires wordLength between 4 and 8",
        );
      }

      if (
        typeof maxAttempts !== "number" ||
        !Number.isInteger(maxAttempts) ||
        maxAttempts < 3 ||
        maxAttempts > 10
      ) {
        throw new ConflictException(
          "Wordle config requires maxAttempts between 3 and 10",
        );
      }

      return;
    }

    const pairsCount = room.gameConfig.pairsCount;
    if (
      typeof pairsCount !== "number" ||
      !Number.isInteger(pairsCount) ||
      pairsCount < 2 ||
      pairsCount > 20
    ) {
      throw new ConflictException(
        "Memory config requires pairsCount between 2 and 20",
      );
    }
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
