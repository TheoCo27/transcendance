import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useToast } from "../components/ui/toast";
import { useAuthSession } from "../hooks/useAuthSession";
import { getRoomById, type Room, updateRoom } from "../services/rooms";
import { getUserById } from "../services/users";
import { connectWs, emitWs, offWs, onWs, WsResponse } from "../services/ws";

type RoomStartPayload = {
  roomId: number;
  userId?: number;
};

type RoomLeavePayload = {
  roomId: number;
  userId?: number;
};

type RoomConfigForm = {
  name: string;
  gameType: "wordle" | "memory";
  wordleWordLength: number;
  wordleMaxAttempts: number;
  memoryPairsCount: number;
};

type ChatMessagePayload = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

const DEFAULT_FORM: RoomConfigForm = {
  name: "",
  gameType: "wordle",
  wordleWordLength: 5,
  wordleMaxAttempts: 6,
  memoryPairsCount: 8,
};

export default function RoomPage() {
  const { roomId: roomIdParam } = useParams();
  const roomId = Number(roomIdParam);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isLoading } = useAuthSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomConfigForm>(DEFAULT_FORM);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessagePayload[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const userIds = new Set<number>();

    room?.players.forEach((player) => userIds.add(player.userId));
    chatMessages.forEach((message) => userIds.add(message.userId));

    if (userIds.size === 0) {
      return;
    }

    const loadPlayerNames = async () => {
      const nextEntries = await Promise.all(
        [...userIds].map(async (userId) => {
          try {
            const fetchedUser = await getUserById(userId);
            return [userId, fetchedUser.username] as const;
          } catch {
            return [userId, `Joueur #${userId}`] as const;
          }
        }),
      );

      setPlayerNames((currentNames) => ({
        ...currentNames,
        ...Object.fromEntries(nextEntries),
      }));
    };

    void loadPlayerNames();
  }, [chatMessages, room]);

  const canStart = useMemo(() => {
    if (!room || !user) return false;
    if (room.ownerUserId !== user.id) return false;
    if (room.status !== "waiting") return false;

    if (form.gameType === "wordle") {
      return (
        Number.isInteger(form.wordleWordLength) &&
        form.wordleWordLength >= 4 &&
        form.wordleWordLength <= 8 &&
        Number.isInteger(form.wordleMaxAttempts) &&
        form.wordleMaxAttempts >= 3 &&
        form.wordleMaxAttempts <= 10
      );
    }

    return (
      Number.isInteger(form.memoryPairsCount) &&
      form.memoryPairsCount >= 2 &&
      form.memoryPairsCount <= 20
    );
  }, [form, room, user]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, navigate, user]);

  useEffect(() => {
    if (!Number.isInteger(roomId) || roomId < 1) {
      setPageError("Room invalide");
      setIsRoomLoading(false);
      return;
    }

    const loadRoom = async () => {
      setPageError(null);
      setIsRoomLoading(true);

      try {
        const fetchedRoom = await getRoomById(roomId);
        setRoom(fetchedRoom);
        setForm(buildFormFromRoom(fetchedRoom));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger la room";
        setPageError(message);
        toast.error(message);
      } finally {
        setIsRoomLoading(false);
      }
    };

    void loadRoom();
  }, [roomId]);

  useEffect(() => {
    const currentUserId = user?.id;

    const handleRoomState = (response: {
      success: boolean;
      data: Room | null;
      error: { message: string } | null;
    }) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
    };

    const handleRoomStarted = (response: {
      success: boolean;
      data: Room | null;
      error: { message: string } | null;
    }) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setIsStarting(false);
      setRoom(response.data);
      setSaveMessage("Partie demarree");
      setPageError(null);
    };

    const handleRoomStartError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setIsStarting(false);
      const message =
        response.error?.message ?? "Impossible de demarrer la room";
      setPageError(message);
      toast.error(message);
    };

    const handleRoomLeft = (response: {
      success: boolean;
      data: { roomId: number; userId: number } | null;
      error: { message: string } | null;
    }) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      if (
        typeof currentUserId === "number" &&
        response.data.userId === currentUserId
      ) {
        setIsLeaving(false);
        navigate("/");
      }
    };

    const handleRoomLeaveError = (response: {
      success: boolean;
      data: null;
      error: { message: string } | null;
    }) => {
      setIsLeaving(false);
      const message =
        response.error?.message ?? "Impossible de quitter la room";

      if (/not in this room/i.test(message)) {
        navigate("/");
        return;
      }

      setPageError(message);
      toast.error(message);
    };

    const handleChatMessage = (response: WsResponse<ChatMessagePayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      )
        return;

      const message = response.data;
      setChatMessages((currentMessages) => [...currentMessages, message]);
      setChatError(null);
    };

    const handleChatError = (response: WsResponse<never>) => {
      if (response.success) return;

      setChatError(response.error?.message ?? "Envoi du message impossible.");
    };

    onWs("room:state", handleRoomState);
    onWs("room:started", handleRoomStarted);
    onWs("room:start:error", handleRoomStartError);
    onWs("room:left", handleRoomLeft);
    onWs("room:leave:error", handleRoomLeaveError);
    onWs("chat:message", handleChatMessage);
    onWs("chat:message:error", handleChatError);

    return () => {
      offWs("room:state", handleRoomState);
      offWs("room:started", handleRoomStarted);
      offWs("room:start:error", handleRoomStartError);
      offWs("room:left", handleRoomLeft);
      offWs("room:leave:error", handleRoomLeaveError);
      offWs("chat:message", handleChatMessage);
      offWs("chat:message:error", handleChatError);
    };
  }, [navigate, roomId, toast, user?.id]);

  const handleSave = async () => {
    if (!room) {
      return;
    }

    setIsSaving(true);
    setPageError(null);
    setSaveMessage(null);

    try {
      const nextConfig =
        form.gameType === "wordle"
          ? {
              wordLength: form.wordleWordLength,
              maxAttempts: form.wordleMaxAttempts,
            }
          : {
              pairsCount: form.memoryPairsCount,
            };

      const updatedRoom = await updateRoom(room.id, {
        name: form.name.trim(),
        gameType: form.gameType,
        gameConfig: nextConfig,
      });

      setRoom(updatedRoom);
      setForm(buildFormFromRoom(updatedRoom));
      setSaveMessage("Configuration enregistree");
      emitWs("room:list-updated");
      emitWs("room:state", {
        roomId: updatedRoom.id,
        room: updatedRoom,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la configuration";
      setPageError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async () => {
    if (!room || !user) {
      return;
    }

    setIsStarting(true);
    setPageError(null);
    setSaveMessage(null);

    try {
      await connectWs();

      emitWs<RoomStartPayload>("room:start", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsStarting(false);
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de demarrer la room";
      setPageError(message);
      toast.error(message);
    }
  };

  const handleLeave = async () => {
    if (!room || !user) {
      return;
    }

    setIsLeaving(true);
    setPageError(null);
    setSaveMessage(null);

    try {
      await connectWs();

      emitWs<RoomLeavePayload>("room:leave", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsLeaving(false);
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de quitter la room";
      setPageError(message);
      toast.error(message);
    }
  };

  const chatEntries = useMemo(
    () =>
      chatMessages.map((message) => ({
        ...message,
        username: playerNames[message.userId] ?? `Joueur #${message.userId}`,
        isSelf: message.userId === user?.id,
      })),
    [chatMessages, playerNames, user?.id],
  );

  const isOwner = user && room && user.id === room.ownerUserId;
  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

  const sendChatMessage = async () => {
    if (!user || !room || chatInput.trim().length === 0) {
      return;
    }

    try {
      setChatError(null);
      await connectWs();
      emitWs("chat:message", {
        roomId: room.id,
        userId: user.id,
        content: chatInput.trim(),
      });
      setChatInput("");
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Connexion temps reel impossible pour envoyer le message.",
      );
    }
  };

  if (isLoading || !user || isRoomLoading) {
    return null;
  }

  if (!room) {
    return (
      <main className="mx-auto flex w-full  max-w-6xl flex-1 px-6 py-8">
        <div className="rounded-2xl w-full border border-danger/60 bg-surface p-6 text-danger">
          {pageError ?? "Room introuvable"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-8">
      <div className="flex w-full flex-col gap-6">
        <section className="rounded-2xl border border-white/10 bg-surface p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Room #{room.id}</h1>
            <p className="mt-2 text-sm text-text-muted">
              Proprietaire: {room.ownerUserId} | Joueurs: {room.players.length}{" "}
              | Statut: {room.status}
            </p>
          </div>
          <PrimaryButton
            className="px-4 py-2"
            disabled={isLeaving}
            onClick={() => {
              void handleLeave();
            }}
          >
            {isLeaving ? "Sortie..." : "Quitter la room"}
          </PrimaryButton>
        </section>

        {isOwner && room.status === "waiting" ? (
          <section className="rounded-2xl border border-white/10 bg-surface p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Configuration de la room
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-muted">
                  Nom de la room
                </span>
                <input
                  className="rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={form.name}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }));
                  }}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-muted">
                  Type de jeu
                </span>
                <select
                  className="rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={form.gameType}
                  onChange={(event) => {
                    const gameType = event.target.value as "wordle" | "memory";
                    setForm((previous) => ({ ...previous, gameType }));
                  }}
                >
                  <option value="wordle">Wordle</option>
                  <option value="memory">Memory</option>
                </select>
              </label>

              {form.gameType === "wordle" ? (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-muted">
                      Longueur du mot (4-8)
                    </span>
                    <input
                      className="rounded-md border border-border bg-bg px-3 py-2 text-text"
                      type="number"
                      min={4}
                      max={8}
                      value={form.wordleWordLength}
                      onChange={(event) => {
                        setForm((previous) => ({
                          ...previous,
                          wordleWordLength: Number(event.target.value),
                        }));
                      }}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-muted">
                      Essais max (3-10)
                    </span>
                    <input
                      className="rounded-md border border-border bg-bg px-3 py-2 text-text"
                      type="number"
                      min={3}
                      max={10}
                      value={form.wordleMaxAttempts}
                      onChange={(event) => {
                        setForm((previous) => ({
                          ...previous,
                          wordleMaxAttempts: Number(event.target.value),
                        }));
                      }}
                    />
                  </label>
                </>
              ) : (
                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-text-muted">
                    Nombre de paires (2-20)
                  </span>
                  <input
                    className="rounded-md border border-border bg-bg px-3 py-2 text-text"
                    type="number"
                    min={2}
                    max={20}
                    value={form.memoryPairsCount}
                    onChange={(event) => {
                      setForm((previous) => ({
                        ...previous,
                        memoryPairsCount: Number(event.target.value),
                      }));
                    }}
                  />
                </label>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryButton
                className="px-5 py-2.5 text-sm"
                disabled={isSaving}
                onClick={() => {
                  void handleSave();
                }}
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </PrimaryButton>

              <PrimaryButton
                className="px-5 py-2.5 text-sm"
                disabled={isStarting || !canStart}
                onClick={() => {
                  void handleStart();
                }}
              >
                {isStarting ? "Demarrage..." : "Demarrer la partie"}
              </PrimaryButton>
            </div>

            {saveMessage ? (
              <p className="mt-4 text-sm text-success">{saveMessage}</p>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-4xl border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Chat room
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            Discussion en direct
          </h2>

          <div className="mt-6 max-h-90 space-y-3 overflow-y-auto rounded-3xl bg-slate-100/80 p-4">
            {chatEntries.length > 0 ? (
              chatEntries.map((message, index) => (
                <article
                  key={`${message.sentAt}-${message.userId}-${index}`}
                  className={[
                    "max-w-[88%] rounded-[1.25rem] px-4 py-3",
                    message.isSelf
                      ? "ml-auto bg-primary text-white"
                      : "bg-white text-slate-900",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "text-xs font-semibold uppercase tracking-[0.18em]",
                      message.isSelf ? "text-white/70" : "text-slate-500",
                    ].join(" ")}
                  >
                    {message.username}
                  </p>
                  <p className="mt-2 text-sm leading-6">{message.content}</p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.25rem] bg-white px-4 py-4 text-sm text-slate-600">
                Aucun message pour l'instant. Lance la conversation.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-md border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-amber-500"
              placeholder={
                isUserInRoom
                  ? "Ecrire un message a la room..."
                  : "Rejoins la room pour discuter..."
              }
              value={chatInput}
              disabled={!isUserInRoom}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendChatMessage();
                }
              }}
            />
            <PrimaryButton
              className="justify-center w-full max-w-40"
              disabled={!isUserInRoom || chatInput.trim().length === 0}
              onClick={sendChatMessage}
            >
              Envoyer
            </PrimaryButton>
          </div>

          {chatError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {chatError}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function buildFormFromRoom(room: Room): RoomConfigForm {
  const gameType = room.gameType ?? "wordle";
  const config =
    room.gameConfig && typeof room.gameConfig === "object"
      ? room.gameConfig
      : {};

  const wordLengthRaw = (config as { wordLength?: unknown }).wordLength;
  const maxAttemptsRaw = (config as { maxAttempts?: unknown }).maxAttempts;
  const pairsCountRaw = (config as { pairsCount?: unknown }).pairsCount;

  const wordleWordLength =
    typeof wordLengthRaw === "number" && Number.isInteger(wordLengthRaw)
      ? wordLengthRaw
      : 5;
  const wordleMaxAttempts =
    typeof maxAttemptsRaw === "number" && Number.isInteger(maxAttemptsRaw)
      ? maxAttemptsRaw
      : 6;
  const memoryPairsCount =
    typeof pairsCountRaw === "number" && Number.isInteger(pairsCountRaw)
      ? pairsCountRaw
      : 8;

  return {
    name: room.name,
    gameType,
    wordleWordLength,
    wordleMaxAttempts,
    memoryPairsCount,
  };
}
