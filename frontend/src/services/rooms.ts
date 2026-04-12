import { apiRequest } from "./api";

export type RoomPlayer = {
  userId: number;
  joinedAt: string;
};

export type Room = {
  id: number;
  name: string;
  ownerUserId?: number;
  quizId: number | null;
  rounds: number;
  questionDurationMs: number | null;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export function getRoomsByQuizId(quizId: number): Promise<Room[]> {
  return apiRequest<Room[]>(`/rooms/quizzes/${quizId}`);
}
