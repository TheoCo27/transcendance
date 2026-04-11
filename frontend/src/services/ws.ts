import { io, type Socket } from "socket.io-client";

type WsError = {
  code: string;
  message: string;
};

export type WsResponse<T> = {
  success: boolean;
  data: T | null;
  error: WsError | null;
};

const WS_BASE_URL =
  typeof window === "undefined" ? "https://localhost:3000" : window.location.origin;

const socket: Socket = io(`${WS_BASE_URL}/ws`, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export function connectWs(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectWs(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

export function emitWs<T>(event: string, payload?: T): void {
  socket.emit(event, payload);
}

export function onWs<T>(event: string, handler: (payload: WsResponse<T>) => void): void {
  socket.on(event, handler);
}

export function offWs<T>(event: string, handler: (payload: WsResponse<T>) => void): void {
  socket.off(event, handler);
}
