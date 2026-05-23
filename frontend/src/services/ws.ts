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

let isWsAuthenticated = false;
let pendingConnectionPromise: Promise<void> | null = null;
let resolvePendingConnection: (() => void) | null = null;
let rejectPendingConnection: ((error: Error) => void) | null = null;
let pendingConnectionTimeout: number | null = null;

function clearPendingConnection(): void {
  if (pendingConnectionTimeout !== null) {
    window.clearTimeout(pendingConnectionTimeout);
  }

  pendingConnectionPromise = null;
  resolvePendingConnection = null;
  rejectPendingConnection = null;
  pendingConnectionTimeout = null;
}

function ensurePendingConnectionPromise(): Promise<void> {
  if (pendingConnectionPromise) {
    return pendingConnectionPromise;
  }

  pendingConnectionPromise = new Promise<void>((resolve, reject) => {
    resolvePendingConnection = resolve;
    rejectPendingConnection = reject;
    pendingConnectionTimeout = window.setTimeout(() => {
      reject(new Error("Le délai de connexion au temps réel a été dépassé."));
      clearPendingConnection();
    }, WS_CONNECT_TIMEOUT_MS);
  });

  return pendingConnectionPromise;
}

socket.on("ws:connected", () => {
  isWsAuthenticated = true;
  resolvePendingConnection?.();
  clearPendingConnection();
});

socket.on("ws:auth:error", (payload?: WsResponse<never>) => {
  isWsAuthenticated = false;
  rejectPendingConnection?.(
    new Error(payload?.error?.message ?? "Authentification temps réel impossible."),
  );
  clearPendingConnection();
});

socket.on("connect_error", (error: Error) => {
  isWsAuthenticated = false;
  rejectPendingConnection?.(error);
  clearPendingConnection();
});

socket.on("disconnect", () => {
  isWsAuthenticated = false;
  rejectPendingConnection?.(
    new Error("La connexion temps réel a été interrompue."),
  );
  clearPendingConnection();
});

export function connectWs(): Promise<void> {
  if (isWsAuthenticated) {
    return Promise.resolve();
  }

  const pendingPromise = ensurePendingConnectionPromise();

  if (!socket.connected) {
    socket.connect();
  }

  return pendingPromise;
}

export function disconnectWs(): void {
  isWsAuthenticated = false;
  rejectPendingConnection?.(
    new Error("La connexion temps réel a été interrompue."),
  );
  clearPendingConnection();
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
