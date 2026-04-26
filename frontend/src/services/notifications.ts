import { apiRequest } from "./api";

export type NotificationItem = {
  id: number;
  recipientId: number;
  actorUserId: number | null;
  resource:
    | "user"
    | "profile"
    | "avatar"
    | "room"
    | "quiz"
    | "friend_request"
    | "private_message";
  resourceId: number | null;
  action: "created" | "updated" | "deleted";
  title: string;
  message: string;
  metadata: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export async function listNotifications(params?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationItem[]> {
  const searchParams = new URLSearchParams();

  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  if (params?.unreadOnly) {
    searchParams.set("unreadOnly", "true");
  }

  const query = searchParams.toString();
  return apiRequest<NotificationItem[]>(
    `/notifications${query.length > 0 ? `?${query}` : ""}`,
  );
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiRequest<{ unreadCount: number }>(
    "/notifications/unread-count",
  );

  return response.unreadCount;
}

export async function markNotificationAsRead(
  notificationId: number,
): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const response = await apiRequest<{ updatedCount: number }>(
    "/notifications/read-all",
    {
      method: "PATCH",
    },
  );

  return response.updatedCount;
}
