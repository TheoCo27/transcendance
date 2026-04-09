import type { SafeUser } from "./auth";
import { apiRequest } from "./api";

export function getUserById(userId: number): Promise<SafeUser> {
  return apiRequest<SafeUser>(`/users/${userId}`);
}
