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

const WS_CONNECT_TIMEOUT_MS = 5000;

const WS_BASE_URL =
  typeof window === "undefined"
    ? "https://localhost:3000"
    : window.location.origin;

const socket: Socket = io(`${WS_BASE_URL}/ws`, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export function connectWs(): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      reject(new Error("WebSocket connection timeout"));
    }, WS_CONNECT_TIMEOUT_MS);

    const clear = () => {
      window.clearTimeout(timeout);
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
    };

    const handleConnect = () => {
      clear();
      resolve();
    };

    const handleConnectError = (error: Error) => {
      clear();
      reject(error);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.connect();
  });
}

export function disconnectWs(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

export function emitWs<T>(event: string, payload?: T): void {
  socket.emit(event, payload);
}

export function onWs<T>(
  event: string,
  handler: (payload: WsResponse<T>) => void,
): void {
  socket.on(event, handler);
}

export function offWs<T>(
  event: string,
  handler: (payload: WsResponse<T>) => void,
): void {
  socket.off(event, handler);
}
