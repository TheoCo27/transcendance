import { NotificationsService } from "@/modules/notifications/notifications.service";
import { UsersService, type FriendUserSummary } from "@/modules/users/users.service";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

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

type PrivateMessagesStore = {
  nextMessageId: number;
  messages: PrivateMessage[];
};

@Injectable()
export class PrivateMessagesService {
  private readonly storeFilePath = path.resolve(
    process.cwd(),
    ".runtime/private-messages-store.json",
  );

  private nextMessageId = 1;

  private messages: PrivateMessage[] = [];

  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.loadStore();
  }

  // Resume chaque conversation privee d'un utilisateur.
  async listConversationSummaries(
    userId: number,
  ): Promise<PrivateConversationSummary[]> {
    const friends = await this.usersService.listFriends(userId);
    const friendIds = new Set(friends.map((friend) => friend.id));
    const latestByFriendId = new Map<number, PrivateMessage>();
    const unreadCountByFriendId = new Map<number, number>();

    for (const message of this.messages) {
      const isSentByUser =
        message.senderId === userId && friendIds.has(message.receiverId);
      const isReceivedByUser =
        message.receiverId === userId && friendIds.has(message.senderId);

      if (!isSentByUser && !isReceivedByUser) {
        continue;
      }

      const friendId = message.senderId === userId ? message.receiverId : message.senderId;
      const previousLatest = latestByFriendId.get(friendId);

      if (
        !previousLatest ||
        new Date(message.createdAt).getTime() >
          new Date(previousLatest.createdAt).getTime() ||
        (message.createdAt === previousLatest.createdAt &&
          message.id > previousLatest.id)
      ) {
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
          lastMessageAt: latestMessage?.createdAt ?? null,
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

    let hasUnreadMessages = false;
    const readAt = new Date().toISOString();
    const conversation = this.messages
      .filter((message) => this.isConversationMessage(message, userId, friendId))
      .map((message) => {
        if (
          message.senderId === friendId &&
          message.receiverId === userId &&
          message.readAt === null
        ) {
          hasUnreadMessages = true;
          return {
            ...message,
            readAt,
          };
        }

        return message;
      })
      .sort((left, right) => {
        const timeDifference =
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

        return timeDifference !== 0 ? timeDifference : left.id - right.id;
      });

    if (hasUnreadMessages) {
      this.messages = this.messages.map((message) => {
        if (
          message.senderId === friendId &&
          message.receiverId === userId &&
          message.readAt === null
        ) {
          return {
            ...message,
            readAt,
          };
        }

        return message;
      });

      this.persistStore();
    }

    return conversation;
  }

  // Envoie un message prive puis cree la notification associee.
  async sendMessage(
    senderId: number,
    friendId: number,
    rawContent: string,
  ): Promise<PrivateMessage> {
    await this.assertMessagingAllowed(senderId, friendId);

    const content = rawContent.trim();
    const createdAt = new Date().toISOString();
    const message: PrivateMessage = {
      id: this.nextMessageId,
      senderId,
      receiverId: friendId,
      content,
      createdAt,
      readAt: null,
    };

    this.nextMessageId += 1;
    this.messages.push(message);
    this.persistStore();

    await this.notificationsService.create({
      recipientId: friendId,
      actorUserId: senderId,
      resource: "private_message",
      resourceId: message.id,
      action: "created",
      title: "Nouveau message prive",
      message: "Vous avez recu un nouveau message prive.",
      metadata: {
        friendId: senderId,
        messageId: message.id,
      },
    });

    return message;
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

  // Indique si un message appartient a cette conversation.
  private isConversationMessage(
    message: PrivateMessage,
    userId: number,
    friendId: number,
  ): boolean {
    return (
      (message.senderId === userId && message.receiverId === friendId) ||
      (message.senderId === friendId && message.receiverId === userId)
    );
  }

  // Recharge le stockage local des messages prives.
  private loadStore(): void {
    if (!existsSync(this.storeFilePath)) {
      return;
    }

    try {
      const rawStore = JSON.parse(
        readFileSync(this.storeFilePath, "utf8"),
      ) as Partial<PrivateMessagesStore>;

      this.messages = Array.isArray(rawStore.messages)
        ? rawStore.messages
            .filter(
              (message): message is PrivateMessage =>
                typeof message?.id === "number" &&
                typeof message?.senderId === "number" &&
                typeof message?.receiverId === "number" &&
                typeof message?.content === "string" &&
                typeof message?.createdAt === "string" &&
                (typeof message?.readAt === "string" || message?.readAt === null),
            )
            .sort((left, right) => left.id - right.id)
        : [];

      const highestMessageId = this.messages.reduce(
        (currentMax, message) => Math.max(currentMax, message.id),
        0,
      );

      this.nextMessageId = Math.max(
        1,
        typeof rawStore.nextMessageId === "number"
          ? rawStore.nextMessageId
          : highestMessageId + 1,
      );
    } catch {
      this.messages = [];
      this.nextMessageId = 1;
    }
  }

  // Sauvegarde les messages prives sur disque.
  private persistStore(): void {
    const directory = path.dirname(this.storeFilePath);
    mkdirSync(directory, { recursive: true });

    const payload: PrivateMessagesStore = {
      nextMessageId: this.nextMessageId,
      messages: this.messages,
    };
    const temporaryFilePath = `${this.storeFilePath}.tmp`;

    writeFileSync(temporaryFilePath, JSON.stringify(payload, null, 2), "utf8");
    renameSync(temporaryFilePath, this.storeFilePath);
  }
}
