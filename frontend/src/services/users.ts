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
