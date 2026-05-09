import { PrismaService } from "@/prisma/prisma.service";
import {
  Prisma,
  type NotificationAction,
  type NotificationResource,
} from "@generated/prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";

export type NotificationItem = {
  id: number;
  recipientId: number;
  actorUserId: number | null;
  resource: NotificationResource;
  resourceId: number | null;
  action: NotificationAction;
  title: string;
  message: string;
  metadata: Prisma.JsonValue | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type CreateNotificationInput = {
  recipientId: number;
  actorUserId?: number;
  resource: NotificationResource;
  resourceId?: number | null;
  action: NotificationAction;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null;
};

type ListNotificationsOptions = {
  limit?: number;
  unreadOnly?: boolean;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Cree une notification pour un utilisateur.
  async create(input: CreateNotificationInput): Promise<NotificationItem> {
    const notification = await this.prisma.client.notification.create({
      data: {
        recipientId: input.recipientId,
        actorUserId: input.actorUserId ?? null,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        action: input.action,
        title: input.title,
        message: input.message,
        metadata:
          input.metadata === undefined ? undefined : (input.metadata ?? Prisma.JsonNull),
      },
    });

    return this.toNotificationItem(notification);
  }

  // Cree une notification identique pour plusieurs destinataires.
  async createMany(
    recipientIds: number[],
    input: Omit<CreateNotificationInput, "recipientId">,
  ): Promise<NotificationItem[]> {
    const uniqueRecipientIds = Array.from(
      new Set(recipientIds.filter((recipientId) => Number.isInteger(recipientId))),
    );

    return Promise.all(
      uniqueRecipientIds.map((recipientId) =>
        this.create({
          ...input,
          recipientId,
        }),
      ),
    );
  }

  // Liste les notifications d'un utilisateur avec filtres simples.
  async listForUser(
    userId: number,
    options: ListNotificationsOptions = {},
  ): Promise<NotificationItem[]> {
    const limit = this.normalizeLimit(options.limit);

    const notifications = await this.prisma.client.notification.findMany({
      where: {
        recipientId: userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });

    return notifications.map((notification) => this.toNotificationItem(notification));
  }

  // Compte les notifications non lues d'un utilisateur.
  async countUnreadForUser(userId: number): Promise<number> {
    return this.prisma.client.notification.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    });
  }

  // Marque une notification precise comme lue.
  async markAsRead(
    userId: number,
    notificationId: number,
  ): Promise<NotificationItem> {
    const notification = await this.prisma.client.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId) {
      throw new NotFoundException(
        `Notification ${notificationId} not found for user ${userId}`,
      );
    }

    if (notification.readAt) {
      return this.toNotificationItem(notification);
    }

    const updatedNotification = await this.prisma.client.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
      },
    });

    return this.toNotificationItem(updatedNotification);
  }

  // Marque toutes les notifications non lues comme lues.
  async markAllAsRead(userId: number): Promise<{ updatedCount: number }> {
    const result = await this.prisma.client.notification.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  // Encadre la limite de resultats dans une plage sure.
  private normalizeLimit(limit?: number): number {
    if (typeof limit !== "number" || Number.isNaN(limit)) {
      return 50;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), 100);
  }

  // Formate une notification Prisma pour l'API.
  private toNotificationItem(notification: {
    id: number;
    recipientId: number;
    actorUserId: number | null;
    resource: NotificationResource;
    resourceId: number | null;
    action: NotificationAction;
    title: string;
    message: string;
    metadata: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationItem {
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      actorUserId: notification.actorUserId,
      resource: notification.resource,
      resourceId: notification.resourceId,
      action: notification.action,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      isRead: notification.readAt !== null,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
