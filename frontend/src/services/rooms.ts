import { apiRequest } from "./api";

export const QUIZ_ROOM_NAME_MIN_LENGTH = 2;
export const QUIZ_ROOM_PASSWORD_MIN_LENGTH = 4;
export const QUIZ_ROOM_ROUNDS_DEFAULT = 5;

export type RoomPlayer = {
  userId: number;
  joinedAt: string;
};

export type Room = {
  id: number;
  name: string;
  ownerUserId: number;
  quizId: number | null;
  rounds: number;
  questionDurationMs: number | null;
  isPrivate: boolean;
  gameType: "wordle" | "memory" | "quiz" | null;
  gameConfig: Record<string, unknown> | null;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type CreateRoomPayload = {
  name: string;
  rounds?: number;
  quizId?: number;
  questionDurationSec?: number | null;
  isPrivate: boolean;
  password?: string;
};

export type JoinRoomPayload = {
  userId: number;
  password?: string;
};

export type UpdateRoomPayload = {
  name?: string;
  gameType?: "wordle" | "memory" | "quiz";
  gameConfig?: Record<string, unknown>;
  quizId?: number | null;
  isPrivate?: boolean;
  password?: string;
};

export function getRooms(): Promise<Room[]> {
  return apiRequest<Room[]>("/rooms");
}

export function getRoomById(roomId: number): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}`);
}

export function getRoomsByQuizId(quizId: number): Promise<Room[]> {
  return apiRequest<Room[]>(`/rooms/quizzes/${quizId}`);
}

export function createRoom(payload: CreateRoomPayload): Promise<Room> {
  return apiRequest<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function joinRoom(
  roomId: number,
  payload: JoinRoomPayload,
): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRoom(
  roomId: number,
  payload: UpdateRoomPayload,
): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
