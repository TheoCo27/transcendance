// Ce fichier suit la presence temps reel en liant les sockets connectes
// aux utilisateurs authentifies.
import { UsersService } from "@/modules/users/users.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";

const PRESENCE_OFFLINE_GRACE_PERIOD_MS = 3_000;

@Injectable()
export class RealtimePresenceService {
  private readonly socketToUser = new Map<string, number>();
  private readonly userToSockets = new Map<number, Set<string>>();
  private readonly pendingOfflineStatus = new Map<number, NodeJS.Timeout>();

  constructor(private readonly usersService: UsersService) {}

  // Associe un socket connecte a un utilisateur.
  async bindSocketToUser(socketId: string, userId: number): Promise<void> {
    const hadActiveSockets = this.userToSockets.has(userId);
    this.cancelPendingOfflineStatus(userId);

    this.socketToUser.set(socketId, userId);

    const sockets = this.userToSockets.get(userId) || new Set<string>();
    sockets.add(socketId);
    this.userToSockets.set(userId, sockets);

    if (!hadActiveSockets) {
      await this.usersService.setUserStatusIfChanged(userId, "online");
    }
  }

  // Recupere l'utilisateur lie au socket et verifie le payload.
  resolveSocketUser(
    socketId: string,
    payloadUserId?: number,
    missingUserMessage = "Missing userId for this socket",
  ): number {
    const boundUserId = this.socketToUser.get(socketId);

    if (typeof boundUserId !== "number") {
      throw new UnauthorizedException(missingUserMessage);
    }

    if (typeof payloadUserId === "number" && boundUserId !== payloadUserId) {
      throw new UnauthorizedException("Socket user mismatch");
    }

    return boundUserId;
  }

  // Retire un socket du suivi de presence.
  async unregisterSocket(socketId: string): Promise<number | undefined> {
    const userId = this.socketToUser.get(socketId);
    if (typeof userId !== "number") {
      return undefined;
    }

    this.socketToUser.delete(socketId);
    const sockets = this.userToSockets.get(userId);
    if (!sockets) {
      this.scheduleOfflineStatus(userId);
      return userId;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userToSockets.delete(userId);
    }

    if (!this.userToSockets.has(userId)) {
      this.scheduleOfflineStatus(userId);
    }

    return userId;
  }

  // Indique si un utilisateur a encore des sockets actifs.
  hasActiveSockets(userId: number): boolean {
    return this.userToSockets.has(userId);
  }

  // Reinitialise completement l'etat de presence.
  clear(): void {
    this.pendingOfflineStatus.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingOfflineStatus.clear();
    this.socketToUser.clear();
    this.userToSockets.clear();
  }

  private scheduleOfflineStatus(userId: number): void {
    this.cancelPendingOfflineStatus(userId);

    const timeout = setTimeout(() => {
      this.pendingOfflineStatus.delete(userId);

      if (this.userToSockets.has(userId)) {
        return;
      }

      void this.usersService.setUserStatusIfChanged(userId, "offline");
    }, PRESENCE_OFFLINE_GRACE_PERIOD_MS);

    this.pendingOfflineStatus.set(userId, timeout);
  }

  private cancelPendingOfflineStatus(userId: number): void {
    const timeout = this.pendingOfflineStatus.get(userId);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.pendingOfflineStatus.delete(userId);
  }
}
