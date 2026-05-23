import { apiRequest, apiRequestNullable } from "./api";

export const AUTH_PASSWORD_MIN_LENGTH = 12;
export const AUTH_USERNAME_MIN_LENGTH = 2;

export type SafeUser = {
  id: number;
  email: string;
  username: string;
  isGuest: boolean;
  avatar_url: string | null;
  status: "online" | "offline";
  createdAt: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  username: string;
  password: string;
};

export type GuestLoginPayload = {
  username: string;
};

function emitAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}

export async function login(payload: LoginPayload): Promise<SafeUser> {
  const user = await apiRequest<SafeUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  emitAuthChanged();
  return user;
}

export async function register(payload: RegisterPayload): Promise<SafeUser> {
  const user = await apiRequest<SafeUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  emitAuthChanged();
  return user;
}

export async function loginAsGuest(payload: GuestLoginPayload): Promise<SafeUser> {
  const user = await apiRequest<SafeUser>("/auth/guest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  emitAuthChanged();
  return user;
}

export function getSession(): Promise<SafeUser | null> {
  return apiRequestNullable<SafeUser>("/auth/session");
}

export async function logout(): Promise<{ loggedOut: true }> {
  const result = await apiRequest<{ loggedOut: true }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
  emitAuthChanged();
  return result;
}
