import { useCallback, useEffect, useState } from "react";
import {
  createRoom,
  getRooms,
  joinRoom,
  type CreateRoomPayload,
  type Room,
} from "../services/quiz";

type UseQuizLobbyOptions = {
  userId: number | null;
};

export function useQuizLobby({ userId }: UseQuizLobbyOptions) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomToJoin, setRoomToJoin] = useState<Room | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);

    try {
      const fetchedRooms = await getRooms();
      setRooms(fetchedRooms);
    } catch (error) {
      setRoomsError(
        error instanceof Error ? error.message : "Impossible de charger les rooms",
      );
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const closeJoinModal = useCallback(() => {
    setIsJoinModalOpen(false);
    setRoomToJoin(null);
    setJoinPassword("");
    setJoinError(null);
  }, []);

  const joinTargetRoom = useCallback(
    async (room: Room, password?: string) => {
      if (userId === null) {
        throw new Error("Utilisateur non connecté");
      }

      setJoinError(null);
      setIsJoining(true);

      try {
        const joinedRoom = await joinRoom(room.id, {
          userId,
          ...(password ? { password } : {}),
        });
        setCurrentRoom(joinedRoom);
        closeJoinModal();
        await loadRooms();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de rejoindre la room";
        setJoinError(message);
        throw error;
      } finally {
        setIsJoining(false);
      }
    },
    [closeJoinModal, loadRooms, userId],
  );

  const requestJoinRoom = useCallback(
    async (room: Room) => {
      if (room.isPrivate) {
        setRoomToJoin(room);
        setIsJoinModalOpen(true);
        setJoinPassword("");
        setJoinError(null);
        return;
      }

      await joinTargetRoom(room);
    },
    [joinTargetRoom],
  );

  const confirmJoinRoom = useCallback(async () => {
    if (!roomToJoin) {
      return;
    }

    await joinTargetRoom(roomToJoin, joinPassword);
  }, [joinPassword, joinTargetRoom, roomToJoin]);

  const createRoomAndJoin = useCallback(
    async (payload: CreateRoomPayload) => {
      setRoomsError(null);
      const createdRoom = await createRoom(payload);
      await joinTargetRoom(createdRoom, payload.password);
    },
    [joinTargetRoom],
  );

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  return {
    rooms,
    roomsLoading,
    roomsError,
    currentRoom,
    roomToJoin,
    isJoinModalOpen,
    joinPassword,
    joinError,
    isJoining,
    setJoinPassword,
    closeJoinModal,
    requestJoinRoom,
    confirmJoinRoom,
    createRoomAndJoin,
  };
}
