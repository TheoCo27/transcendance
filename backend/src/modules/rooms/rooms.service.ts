// Ce fichier contient toute la logique metier des rooms:
// creation, join, configuration, chat et transitions d'etat.
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
  gameType: "wordle" | "quiz" | null;
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

  // Liste toutes les rooms sans exposer leur mot de passe.
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

  // Liste les rooms rattachees a un quiz donne.
  async listByQuizId(quizId: number): Promise<Array<Omit<Room, "password">>> {
    return (await this.list()).filter((room) => room.quizId === quizId);
  }

  // Retourne une room par id sans son mot de passe.
  async getById(roomId: number): Promise<Omit<Room, "password">> {
    const room = await this.findRoomOrThrow(roomId);
    return this.stripPassword(this.toRoom(room));
  }

  // Retourne la room la plus recente correspondant a un nom donne.
  async getByName(roomName: string): Promise<Omit<Room, "password">> {
    const normalizedRoomName = roomName.trim();

    const room = await this.prisma.client.room.findFirst({
      where: { name: normalizedRoomName },
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

    if (!room) {
      throw new NotFoundException(`Room ${normalizedRoomName} not found`);
    }

    return this.stripPassword(this.toRoom(room));
  }

  // Cree une room et memorise sa config transitoire.
  async create(
    dto: CreateRoomDto & {
      ownerUserId?: number;
    },
  ): Promise<Omit<Room, "password">> {
    if (typeof dto.ownerUserId !== "number") {
      throw new BadRequestException("ownerUserId is required to create a room");
    }

    let room;

    try {
      room = await this.prisma.client.room.create({
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
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Ce nom de room est déjà pris");
      }

      throw error;
    }

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

  // Ajoute un joueur a une room si elle est rejoignable.
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

  // Retourne l'historique de chat d'une room.
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

  // Enregistre un nouveau message dans la room.
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

  // Met a jour la configuration editable d'une room.
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

  // Retire un joueur d'une room et gere le changement de proprietaire.
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

  // Demarre la partie d'une room apres validation.
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

  // Passe une room en statut termine.
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

  // Reprepare une room pour une nouvelle partie.
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

  // Supprime une room vide et non active.
  async close(roomId: number): Promise<{ roomId: number }> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.status === "playing") {
      throw new ConflictException(
        "Impossible de fermer une room avec une partie en cours",
      );
    }

    return this.closeIfEmpty(roomId);
  }

  // Supprime une room vide, meme si elle etait encore marquee comme active.
  async closeIfEmpty(roomId: number): Promise<{ roomId: number }> {
    await this.findRoomOrThrow(roomId);

    const playerCount = await this.prisma.client.roomPlayer.count({
      where: { roomId },
    });
    if (playerCount > 0) {
      throw new ConflictException(
        "Impossible de fermer une room tant qu'il y a des joueurs",
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.deleteRoomGraph(tx, roomId);
    });
    this.transientConfigs.delete(roomId);

    return { roomId };
  }

  // Supprime une room sur demande explicite de son proprietaire.
  async delete(roomId: number, requesterUserId: number): Promise<{ roomId: number }> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.ownerId !== requesterUserId) {
      throw new UnauthorizedException(
        "Seul le proprietaire de la room peut la supprimer",
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.deleteRoomGraph(tx, roomId);
    });
    this.transientConfigs.delete(roomId);

    return { roomId };
  }

  // Retire le mot de passe du format public d'une room.
  private stripPassword(room: Room): Omit<Room, "password"> {
    const { password, ...publicRoom } = room;
    return publicRoom;
  }

  // Charge une room complete ou leve une erreur.
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

  // Convertit une room Prisma en format API.
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
      gameType:
        room.gameType === "wordle" || room.gameType === "quiz"
          ? room.gameType
          : null,
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

  // Verifie que la config de jeu permet un demarrage.
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
        wordLength < 5 ||
        wordLength > 7
      ) {
        throw new ConflictException(
          "La configuration de Wordle necessite un mot de longueur entre 5 et 7 caracteres",
        );
      }

      if (
        typeof maxAttempts !== "number" ||
        !Number.isInteger(maxAttempts) ||
        maxAttempts < 3 ||
        maxAttempts > 8
      ) {
        throw new ConflictException(
          "La configuration de Wordle necessite un nombre de tentatives entre 3 et 8",
        );
      }

      return;
    }

    throw new ConflictException("Ce type de jeu n'est plus pris en charge");
  }

  // Convertit un JSON Prisma en objet exploitable.
  private toObjectRecord(
    value: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  // Supprime les donnees rattachees a une room avant sa suppression finale.
  private async deleteRoomGraph(
    tx: Prisma.TransactionClient,
    roomId: number,
  ): Promise<void> {
    const games = await tx.game.findMany({
      where: { roomId },
      select: { id: true },
    });
    const gameIds = games.map((game) => game.id);

    if (gameIds.length > 0) {
      await tx.playerAnswer.deleteMany({
        where: {
          gameId: {
            in: gameIds,
          },
        },
      });
      await tx.leaderboard.deleteMany({
        where: {
          gameId: {
            in: gameIds,
          },
        },
      });
      await tx.gameQuestion.deleteMany({
        where: {
          gameId: {
            in: gameIds,
          },
        },
      });
      await tx.game.deleteMany({
        where: { roomId },
      });
    }

    await tx.messages.deleteMany({
      where: { roomId },
    });
    await tx.roomPlayer.deleteMany({
      where: { roomId },
    });
    await tx.room.delete({
      where: { id: roomId },
    });
  }
}
