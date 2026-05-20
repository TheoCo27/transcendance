// Ce fichier gere la messagerie privee entre amis via PostgreSQL/Prisma.
import { PrismaService } from "@/prisma/prisma.service";
import { UsersService, type FriendUserSummary } from "@/modules/users/users.service";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export type PrivateMessage = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  readAt: string | null;
};

export type PrivateConversationSummary = {
  friendId: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

@Injectable()
export class PrivateMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // Resume chaque conversation privee d'un utilisateur.
  async listConversationSummaries(
    userId: number,
  ): Promise<PrivateConversationSummary[]> {
    const friends = await this.usersService.listFriends(userId);
    if (friends.length === 0) {
      return [];
    }

    const friendIds = new Set(friends.map((friend) => friend.id));
    const messages = await this.prisma.client.privateMessage.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: {
              in: Array.from(friendIds),
            },
          },
          {
            receiverId: userId,
            senderId: {
              in: Array.from(friendIds),
            },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
        readAt: true,
      },
    });

    const unreadCountByFriendId = new Map<number, number>();
    const latestByFriendId = new Map<number, typeof messages[number]>();

    for (const message of messages) {
      const friendId = message.senderId === userId ? message.receiverId : message.senderId;
      if (!latestByFriendId.has(friendId)) {
        latestByFriendId.set(friendId, message);
      }

      if (
        message.senderId === friendId &&
        message.receiverId === userId &&
        message.readAt === null
      ) {
        unreadCountByFriendId.set(
          friendId,
          (unreadCountByFriendId.get(friendId) ?? 0) + 1,
        );
      }
    }

    return friends
      .map((friend) => {
        const latestMessage = latestByFriendId.get(friend.id);

        return {
          friendId: friend.id,
          lastMessagePreview: latestMessage
            ? this.buildMessagePreview(latestMessage.content)
            : null,
          lastMessageAt: latestMessage?.createdAt.toISOString() ?? null,
          unreadCount: unreadCountByFriendId.get(friend.id) ?? 0,
        };
      })
      .sort((left, right) => {
        if (left.unreadCount !== right.unreadCount) {
          return right.unreadCount - left.unreadCount;
        }

        if (left.lastMessageAt && right.lastMessageAt) {
          return (
            new Date(right.lastMessageAt).getTime() -
            new Date(left.lastMessageAt).getTime()
          );
        }

        if (left.lastMessageAt) {
          return -1;
        }

        if (right.lastMessageAt) {
          return 1;
        }

        return 0;
      });
  }

  // Retourne l'historique d'une conversation et marque les lus.
  async listConversation(userId: number, friendId: number): Promise<PrivateMessage[]> {
    await this.assertMessagingAllowed(userId, friendId);

    const readAt = new Date().toISOString();
    const conversation = await this.prisma.client.privateMessage.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: friendId,
          },
          {
            senderId: friendId,
            receiverId: userId,
          },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const hasUnreadMessages = conversation.some(
      (message) =>
        message.senderId === friendId &&
        message.receiverId === userId &&
        message.readAt === null,
    );

    if (hasUnreadMessages) {
      await this.prisma.client.privateMessage.updateMany({
        where: {
          senderId: friendId,
          receiverId: userId,
          readAt: null,
        },
        data: {
          readAt: new Date(readAt),
        },
      });
    }

    return conversation.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      readAt:
        hasUnreadMessages &&
        message.senderId === friendId &&
        message.receiverId === userId &&
        message.readAt === null
          ? readAt
          : message.readAt?.toISOString() ?? null,
    }));
  }

  // Envoie un message prive.
  async sendMessage(
    senderId: number,
    friendId: number,
    rawContent: string,
  ): Promise<PrivateMessage> {
    await this.assertMessagingAllowed(senderId, friendId);

    const message = await this.prisma.client.privateMessage.create({
      data: {
        senderId,
        receiverId: friendId,
        content: rawContent.trim(),
      },
    });

    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
    };
  }

  // Verifie que deux utilisateurs peuvent s'ecrire en prive.
  private async assertMessagingAllowed(
    userId: number,
    friendId: number,
  ): Promise<FriendUserSummary> {
    const currentUser = await this.usersService.findUser({ id: userId });
    if (!currentUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const friend = await this.usersService.findUser({ id: friendId });
    if (!friend) {
      throw new NotFoundException(`User ${friendId} not found`);
    }

    if (currentUser.isGuest || friend.isGuest) {
      throw new ForbiddenException(
        "Private messages are only available for classic accounts",
      );
    }

    const areFriends = await this.usersService.areUsersFriends(userId, friendId);

    if (!areFriends) {
      throw new ForbiddenException(
        "Private messages are only available between friends",
      );
    }

    return this.usersService.buildFriendUserSummary(friend);
  }

  // Tronque un message pour l'affichage dans les apercus.
  private buildMessagePreview(content: string): string {
    const normalized = content.trim().replace(/\s+/g, " ");

    if (normalized.length <= 72) {
      return normalized;
    }

    return `${normalized.slice(0, 69)}...`;
  }
}
