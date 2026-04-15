import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useToast } from "../components/ui/toast";
import { useAuthSession } from "../hooks/useAuthSession";
import { getRooms, type Room } from "../services/rooms";
import { connectWs, emitWs, offWs, onWs } from "../services/ws";

export default function HomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthSession();
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
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
          response.error?.message ?? "Impossible de créer la room";
        setCreateError(message);
        toast.error(message);
        return;
      }

      const createdRoom = response.data;

      setCreateError(null);
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
          response.error?.message ?? "Impossible de rejoindre la room";
        setJoinError(message);
        toast.error(message);
        return;
      }

      const joinedRoom = response.data;
      setJoinError(null);
      navigate(`/rooms/${joinedRoom.id}`);
    };

    const handleRoomJoinError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setJoiningRoomId(null);
      const message =
        response.error?.message ?? "Impossible de rejoindre la room";
      setJoinError(message);
      toast.error(message);
    };

    const handleRoomCreateError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setIsCreatingRoom(false);
      const message = response.error?.message ?? "Impossible de créer la room";
      setCreateError(message);
      toast.error(message);
    };

    const handleWsAuthError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setIsCreatingRoom(false);
      setJoiningRoomId(null);
      const message =
        response.error?.message ?? "Authentification WebSocket requise";
      setCreateError(message);
      setJoinError(message);
      toast.error(message);
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
      } catch {}
    };

    void syncRoomList();
  }, [user]);

  const createRoom = async () => {
    if (!user) {
      const msg = "Connecte-toi pour créer une room";
      setCreateError(msg);
      toast.error(msg);
      return;
    }

    try {
      setCreateError(null);
      setIsCreatingRoom(true);
      await connectWs();

      emitWs("room:create", {
        name: "Nouvelle Room",
        userId: user.id,
        isPrivate: false,
      });
    } catch (error) {
      setIsCreatingRoom(false);
      const message = "Impossible de créer la room";
      setCreateError(message);
      toast.error(message);
      console.error("Failed to create room:", error);
    }
  };

  const joinRoom = async (roomId: number) => {
    if (!user) {
      const message = "Connecte-toi pour rejoindre une room";
      setJoinError(message);
      toast.error(message);
      return;
    }

    try {
      setJoinError(null);
      setJoiningRoomId(roomId);
      await connectWs();

      emitWs("room:join", {
        roomId,
        userId: user.id,
      });
    } catch (error) {
      setJoiningRoomId(null);
      const message = "Impossible de rejoindre la room";
      setJoinError(message);
      toast.error(message);
      console.error("Failed to join room:", error);
    }
  };

  return (
    <main className="flex flex-1 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-2xl border border-white/10 bg-surface p-6 md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-border/60 bg-bg/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Mini-jeux multijoueur
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Joue a des mini-jeux en solo ou multijoueur avec tes amis
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-muted md:text-lg">
            Lance une partie de Wordle, participe a des jeux de mots rapides,
            discute avec les autres joueurs via le chat de room et grimpe dans
            le leaderboard en temps reel.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton
              className="px-5 py-3 text-lg font-semibold tracking-wide"
              disabled={isCreatingRoom}
              onClick={createRoom}
            >
              {isCreatingRoom ? "Création..." : "Créer une room"}
            </PrimaryButton>
            <button
              className="rounded-md border border-border bg-transparent px-5 py-3 text-lg font-semibold tracking-wide text-text transition hover:bg-bg/40"
              type="button"
            >
              Rejoindre une room existante
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold md:text-2xl">
              Rooms ouvertes
            </h2>
            <span className="text-sm text-text-muted">
              {recentRooms.length} disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recentRooms.map((room) => (
              <article
                className="rounded-2xl border border-white/10 bg-surface p-5"
                key={room.id}
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{room.name}</h3>
                    <p className="text-sm text-text-muted">{room.gameType}</p>
                  </div>
                  <span className="rounded-full border border-success/60 bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                    {room.status}
                  </span>
                </div>

                <p className="mb-4 text-sm text-text-muted">
                  Joueurs: {room.players.length}
                </p>

                <PrimaryButton
                  className="w-full px-4 py-2.5 text-sm font-semibold"
                  disabled={joiningRoomId === room.id}
                  onClick={() => {
                    void joinRoom(room.id);
                  }}
                >
                  {joiningRoomId === room.id ? "Connexion..." : "Rejoindre"}
                </PrimaryButton>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
