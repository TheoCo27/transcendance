import { apiRequest } from "./api";

export type RoomPlayer = {
  userId: number;
  joinedAt: string;
};

export type Room = {
  id: number;
  name: string;
  rounds: number;
  isPrivate: boolean;
  status: "waiting" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: string;
};

export type CreateRoomPayload = {
  name: string;
  rounds: number;
  isPrivate: boolean;
  password?: string;
};

export type JoinRoomPayload = {
  userId: number;
  password?: string;
};

export function getRooms(): Promise<Room[]> {
  return apiRequest<Room[]>("/rooms");
}

export function createRoom(payload: CreateRoomPayload): Promise<Room> {
  return apiRequest<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function joinRoom(roomId: number, payload: JoinRoomPayload): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
