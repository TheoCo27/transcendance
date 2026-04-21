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

export type RoomMessage = {
  id: number;
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

export type Room = {
  id: number;
  name: string;
  ownerUserId: number;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  gameType: "wordle" | "memory" | "quiz" | null;
  gameConfig: Record<string, unknown> | null;
  quizId: number | null;
  rounds: number;
  questionDurationMs: number | null;
  players: RoomPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  password?: string;
};

type TransientRoomConfig = {
  quizId: number | null;
  rounds: number;
  questionDurationMs: number | null;
};

@Injectable()
export class RoomsService {
  private readonly transientConfigs = new Map<number, TransientRoomConfig>();

  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Array<Omit<Room, "password">>> {
    const rooms = await this.prisma.client.room.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        games: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            quizId: true,
          },
        },
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

  async listByQuizId(quizId: number): Promise<Array<Omit<Room, "password">>> {
    return (await this.list()).filter((room) => room.quizId === quizId);
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
        name: dto.name.trim(),
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
        games: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            quizId: true,
          },
        },
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

    this.transientConfigs.set(room.id, {
      quizId: dto.quizId ?? null,
      rounds: dto.rounds ?? 1,
      questionDurationMs:
        typeof dto.questionDurationSec === "number"
          ? dto.questionDurationSec * 1000
          : null,
    });

    return this.stripPassword(this.toRoom(room));
  }

  async join(
    roomId: number,
    dto: JoinRoomDto,
  ): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    const existingPlayer = await this.prisma.client.roomPlayer.findUnique({
      where: {
        userId_roomId: {
          userId: dto.userId,
          roomId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (existingPlayer) {
      return this.getById(roomId);
    }

    if (room.status !== "waiting") {
      throw new ConflictException(
        "La partie a deja commence, impossible de rejoindre",
      );
    }

    if (room.isPrivate && room.password !== dto.password) {
      throw new UnauthorizedException(
        "Mot de passe incorrect pour rejoindre cette room",
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.roomPlayer.create({
        data: {
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

  async listMessages(roomId: number, limit = 50): Promise<RoomMessage[]> {
    await this.findRoomOrThrow(roomId);

    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const messages = await this.prisma.client.messages.findMany({
      where: { roomId },
      orderBy: { sendAt: "asc" },
      take: safeLimit,
    });

    return messages.map((message) => ({
      id: message.id,
      roomId: message.roomId,
      userId: message.senderId,
      content: message.content,
      sentAt: message.sendAt.toISOString(),
    }));
  }

  async createMessage(payload: {
    roomId: number;
    userId: number;
    content: string;
  }): Promise<RoomMessage> {
    await this.findRoomOrThrow(payload.roomId);

    const message = await this.prisma.client.messages.create({
      data: {
        roomId: payload.roomId,
        senderId: payload.userId,
        content: payload.content,
      },
    });

    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.senderId,
      content: message.content,
      sentAt: message.sendAt.toISOString(),
    };
  }

  async update(
    roomId: number,
    requesterUserId: number,
    dto: UpdateRoomDto,
  ): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.ownerId !== requesterUserId) {
      throw new UnauthorizedException(
        "Seul le proprietaire de la room peut modifier sa configuration",
      );
    }

    if (room.status !== "waiting") {
      throw new ConflictException(
        "La configuration de la room ne peut etre modifiee une fois la partie commencee",
      );
    }

    const updateData: Prisma.RoomUpdateInput = {};
    let hasTransientConfigUpdate = false;

    if (typeof dto.name === "string") {
      updateData.name = dto.name.trim();
    }

    if (typeof dto.gameType === "string") {
      updateData.gameType =
        dto.gameType as unknown as Prisma.RoomUpdateInput["gameType"];
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
          "La room doit etre privee pour definir un mot de passe",
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
        throw new BadRequestException(
          "Le mot de passe doit comporter au moins 4 caracteres",
        );
      }
    }

    if (typeof dto.quizId === "number" || dto.quizId === null) {
      if (typeof dto.quizId === "number") {
        const quiz = await this.prisma.client.quiz.findUnique({
          where: { id: dto.quizId },
          select: { id: true },
        });

        if (!quiz) {
          throw new NotFoundException(`Quiz ${dto.quizId} not found`);
        }
      }

      const currentTransientConfig = this.transientConfigs.get(roomId);
      this.transientConfigs.set(roomId, {
        quizId: dto.quizId,
        rounds: currentTransientConfig?.rounds ?? 1,
        questionDurationMs: currentTransientConfig?.questionDurationMs ?? null,
      });
      hasTransientConfigUpdate = true;
    }

    if (Object.keys(updateData).length === 0 && !hasTransientConfigUpdate) {
      return this.getById(roomId);
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.client.room.update({
        where: { id: roomId },
        data: updateData,
      });
    }

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
      throw new ConflictException("L'utilisateur n'est pas dans cette room");
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
      throw new ConflictException("La partie a deja commence");
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
      throw new UnauthorizedException(
        "L'utilisateur doit etre dans la room pour demarrer la partie",
      );
    }

    if (room.ownerId !== requesterUserId) {
      throw new UnauthorizedException(
        "Seul le proprietaire de la room peut demarrer la partie",
      );
    }

    const playerCount = await this.prisma.client.roomPlayer.count({
      where: { roomId },
    });

    if (playerCount < 1) {
      throw new ConflictException(
        "Il doit y avoir au moins un joueur dans la room pour demarrer la partie",
      );
    }

    const transientConfig = this.transientConfigs.get(room.id);
    this.assertStartConfiguration({
      gameType: room.gameType,
      gameConfig: room.gameConfig,
      quizId: transientConfig?.quizId ?? room.games[0]?.quizId ?? null,
    });

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
      throw new ConflictException("La partie n'est pas en cours");
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

  async resetAfterGame(roomId: number): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status !== "playing") {
      throw new ConflictException("La partie n'est pas en cours");
    }

    await this.prisma.client.room.update({
      where: { id: roomId },
      data: {
        status: "waiting",
        startedAt: null,
        finishedAt: null,
      },
    });

    return this.getById(roomId);
  }

  async close(roomId: number): Promise<{ roomId: number }> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status === "playing") {
      throw new ConflictException(
        "Impossible de fermer une room avec une partie en cours",
      );
    }

    const playerCount = await this.prisma.client.roomPlayer.count({
      where: { roomId },
    });
    if (playerCount > 0) {
      throw new ConflictException(
        "Impossible de fermer une room tant qu'il y a des joueurs",
      );
    }

    await this.prisma.client.room.delete({
      where: { id: roomId },
    });
    this.transientConfigs.delete(roomId);

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
        games: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            quizId: true,
          },
        },
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
    gameType: "wordle" | "memory" | "quiz" | null;
    gameConfig: Prisma.JsonValue | null;
    isPrivate: boolean;
    password: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    games: Array<{ quizId: number }>;
    players: Array<{ userId: number; joinedAt: Date }>;
  }): Room {
    const transientConfig = this.transientConfigs.get(room.id);

    return {
      id: room.id,
      name: room.name,
      ownerUserId: room.ownerId,
      status: room.status,
      gameType: room.gameType,
      gameConfig: this.toObjectRecord(room.gameConfig),
      isPrivate: room.isPrivate,
      quizId: transientConfig?.quizId ?? room.games[0]?.quizId ?? null,
      rounds: transientConfig?.rounds ?? 1,
      questionDurationMs: transientConfig?.questionDurationMs ?? null,
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
    gameType: "wordle" | "memory" | "quiz" | null;
    gameConfig: Prisma.JsonValue | null;
    quizId: number | null;
  }): void {
    if (!room.gameType) {
      throw new ConflictException(
        "La configuration de la room doit inclure un type de jeu avant de pouvoir demarrer la partie",
      );
    }

    if (room.gameType === "quiz") {
      if (typeof room.quizId !== "number") {
        throw new ConflictException(
          "La configuration Quiz necessite de selectionner un quiz avant de pouvoir demarrer la partie",
        );
      }

      return;
    }

    const gameConfig = this.toObjectRecord(room.gameConfig);
    if (!gameConfig) {
      throw new ConflictException(
        "La configuration du jeu doit etre un objet valide avant de pouvoir demarrer la partie",
      );
    }

    if (room.gameType === "wordle") {
      const wordLength = gameConfig.wordLength;
      const maxAttempts = gameConfig.maxAttempts;

      if (
        typeof wordLength !== "number" ||
        !Number.isInteger(wordLength) ||
        wordLength < 4 ||
        wordLength > 8
      ) {
        throw new ConflictException(
          "La configuration de Wordle necessite un mot de longueur entre 4 et 8 caracteres",
        );
      }

      if (
        typeof maxAttempts !== "number" ||
        !Number.isInteger(maxAttempts) ||
        maxAttempts < 3 ||
        maxAttempts > 10
      ) {
        throw new ConflictException(
          "La configuration de Wordle necessite un nombre de tentatives entre 3 et 10",
        );
      }

      return;
    }

    const pairsCount = gameConfig.pairsCount;
    if (
      typeof pairsCount !== "number" ||
      !Number.isInteger(pairsCount) ||
      pairsCount < 2 ||
      pairsCount > 20
    ) {
      throw new ConflictException(
        "La configuration de Memory necessite un nombre de paires entre 2 et 20",
      );
    }
  }

  private toObjectRecord(
    value: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }
}
