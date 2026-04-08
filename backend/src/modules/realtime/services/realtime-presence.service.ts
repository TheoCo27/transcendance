import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class RealtimePresenceService {
  private readonly socketToUser = new Map<string, number>();
  private readonly userToSockets = new Map<number, Set<string>>();

  bindSocketToUser(socketId: string, userId: number): void {
    this.socketToUser.set(socketId, userId);

    const sockets = this.userToSockets.get(userId) || new Set<string>();
    sockets.add(socketId);
    this.userToSockets.set(userId, sockets);
  }

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

  unregisterSocket(socketId: string): number | undefined {
    const userId = this.socketToUser.get(socketId);
    if (typeof userId !== "number") {
      return undefined;
    }

    this.socketToUser.delete(socketId);
    const sockets = this.userToSockets.get(userId);
    if (!sockets) {
      return userId;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userToSockets.delete(userId);
    }

    return userId;
  }

  hasActiveSockets(userId: number): boolean {
    return this.userToSockets.has(userId);
  }

  clear(): void {
    this.socketToUser.clear();
    this.userToSockets.clear();
  }
}
