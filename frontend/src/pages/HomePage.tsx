import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../components/Home/HomeHeader";
import RoomsList from "../components/Home/RoomsList";
import { useToast } from "../components/ui/toast";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingServerMessage } from "../services/api";
import { getRooms, type Room } from "../services/rooms";
import { connectWs, emitWs, offWs, onWs } from "../services/ws";
import { connectRoomErrorMsg, createRoomErrorMsg } from "../utils/err-msg";

export default function HomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthSession();
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<number | null>(null);

  useEffect(() => {
    const handleRoomList = (response: {
      success: boolean;
      data: Room[] | null;
      error: { message: string } | null;
    }) => {
      if (!response.success || !response.data) {
        return;
      }

      setRecentRooms(response.data.slice(0, 5));
    };

    const handleRoomListUpdated = (response: {
      success: boolean;
      data: Room[] | null;
      error: { message: string } | null;
    }) => {
      if (!response.success || !response.data) {
        return;
      }

      setRecentRooms(response.data.slice(0, 5));
    };

    const handleRoomCreated = (response: {
      success: boolean;
      data: Room | null;
      error: { message: string } | null;
    }) => {
      setIsCreatingRoom(false);

      if (!response.success || !response.data) {
        const message =
          getUserFacingServerMessage(
            response.error?.message,
            createRoomErrorMsg["unknown_error"],
          );
        if (message) {
          toast.error(message);
        }
        return;
      }

      const createdRoom = response.data;

      setRecentRooms((previousRooms) =>
        [
          createdRoom,
          ...previousRooms.filter((room) => room.id !== createdRoom.id),
        ].slice(0, 5),
      );
      navigate(`/rooms/${createdRoom.id}`);
    };

    const handleRoomJoined = (response: {
      success: boolean;
      data: Room | null;
      error: { message: string } | null;
    }) => {
      setJoiningRoomId(null);

      if (!response.success || !response.data) {
        const message =
          getUserFacingServerMessage(
            response.error?.message,
            connectRoomErrorMsg["unknown_error"],
          );
        if (message) {
          toast.error(message);
        }
        return;
      }

      navigate(`/rooms/${response.data.id}`);
    };

    const handleRoomJoinError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setJoiningRoomId(null);
      const message =
        getUserFacingServerMessage(
          response.error?.message,
          connectRoomErrorMsg["unknown_error"],
        );
      if (message) {
        toast.error(message);
      }
    };

    const handleRoomCreateError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setIsCreatingRoom(false);
      const message =
        getUserFacingServerMessage(
          response.error?.message,
          createRoomErrorMsg["unknown_error"],
        );
      if (message) {
        toast.error(message);
      }
    };

    const handleWsAuthError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setIsCreatingRoom(false);
      setJoiningRoomId(null);
      const message =
        getUserFacingServerMessage(
          response.error?.message,
          "Authentification WebSocket requise",
        );
      if (message) {
        toast.error(message);
      }
    };

    onWs("room:list", handleRoomList);
    onWs("room:list-updated", handleRoomListUpdated);
    onWs("room:created", handleRoomCreated);
    onWs("room:joined", handleRoomJoined);
    onWs("room:join:error", handleRoomJoinError);
    onWs("room:create:error", handleRoomCreateError);
    onWs("ws:auth:error", handleWsAuthError);

    return () => {
      offWs("room:list", handleRoomList);
      offWs("room:list-updated", handleRoomListUpdated);
      offWs("room:created", handleRoomCreated);
      offWs("room:joined", handleRoomJoined);
      offWs("room:join:error", handleRoomJoinError);
      offWs("room:create:error", handleRoomCreateError);
      offWs("ws:auth:error", handleWsAuthError);
    };
  }, [navigate, toast]);

  useEffect(() => {
    const loadRecentRooms = async () => {
      try {
        const rooms = await getRooms();
        setRecentRooms(rooms.slice(0, 5));
      } catch {
        setRecentRooms([]);
      }
    };

    void loadRecentRooms();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const syncRoomList = async () => {
      try {
        await connectWs();
        emitWs("room:list");
      } catch {
        // Ignore initial sync failures; user actions surface their own feedback.
      }
    };

    void syncRoomList();
  }, [user]);

  const createRoom = async (roomName: string) => {
    if (!user) {
      toast.error(createRoomErrorMsg["auth_required"]);
      return;
    }

    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName) {
      toast.error("Le nom de la room est obligatoire");
      return;
    }

    try {
      setIsCreatingRoom(true);
      await connectWs();

      emitWs("room:create", {
        name: trimmedRoomName,
        userId: user.id,
        isPrivate: false,
      });
    } catch {
      setIsCreatingRoom(false);
      toast.error(createRoomErrorMsg["unknown_error"]);
    }
  };

  const joinRoom = async (roomId: number) => {
    if (!user) {
      toast.error(connectRoomErrorMsg["auth_required"]);
      return;
    }

    try {
      setJoiningRoomId(roomId);
      await connectWs();

      emitWs("room:join", {
        roomId,
        userId: user.id,
      });
    } catch {
      setJoiningRoomId(null);
      toast.error(connectRoomErrorMsg["unknown_error"]);
    }
  };

  return (
    <main className="flex flex-1 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <HomeHeader
          isCreatingRoom={isCreatingRoom}
          createRoom={createRoom}
          userName={user?.username}
          userId={user?.id}
        />
        <RoomsList
          rooms={recentRooms}
          onJoin={joinRoom}
          joiningRoomId={joiningRoomId}
        />
      </div>
    </main>
  );
}
