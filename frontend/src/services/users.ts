import type { SafeUser } from "./auth";
import { apiRequest } from "./api";

export type FriendUserSummary = {
  id: number;
  username: string;
  isGuest: boolean;
  avatar_url: string | null;
  status: "online" | "offline";
  createdAt: string;
};

export type FriendRequestSummary = {
  id: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  user: FriendUserSummary;
};

export type FriendOverview = {
  friends: FriendUserSummary[];
  receivedRequests: FriendRequestSummary[];
  sentRequests: FriendRequestSummary[];
};

export type FriendActionResult = {
  message: string;
  friendshipStatus: "pending" | "accepted" | "declined";
};

export type PrivateConversationSummary = {
  friendId: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type PrivateMessage = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  readAt: string | null;
};

export function getUserById(userId: number): Promise<SafeUser> {
  return apiRequest<SafeUser>(`/users/${userId}`);
}

export function getMyFriendOverview(): Promise<FriendOverview> {
  return apiRequest<FriendOverview>("/users/me/friends");
}

export function sendFriendRequest(username: string): Promise<FriendActionResult> {
  return apiRequest<FriendActionResult>("/users/me/friends", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function respondToFriendRequest(
  requestId: number,
  action: "accepted" | "declined",
): Promise<FriendActionResult> {
  return apiRequest<FriendActionResult>(`/users/me/friends/requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export function getConversationSummaries(): Promise<PrivateConversationSummary[]> {
  return apiRequest<PrivateConversationSummary[]>("/users/me/friends/conversations");
}

export function getPrivateConversation(friendId: number): Promise<PrivateMessage[]> {
  return apiRequest<PrivateMessage[]>(`/users/me/friends/messages/${friendId}`);
}

export function sendPrivateMessage(
  friendId: number,
  content: string,
): Promise<PrivateMessage> {
  return apiRequest<PrivateMessage>(`/users/me/friends/messages/${friendId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updateMyAvatar(avatarDataUrl: string | null): Promise<SafeUser> {
  return apiRequest<SafeUser>("/users/me/avatar", {
    method: "PATCH",
    body: JSON.stringify({ avatarDataUrl }),
  });
}
