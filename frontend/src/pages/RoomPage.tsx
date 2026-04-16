import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useToast } from "../components/ui/toast";
import { useAuthSession } from "../hooks/useAuthSession";
import { getGameState, type GameState } from "../services/game";
import {
  getRoomById,
  type Room,
  updateRoom,
} from "../services/rooms";
import { getUserById } from "../services/users";
import {
  connectWs,
  disconnectWs,
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";

type PublicQuestion = {
  id: number;
  text: string;
  options: string[];
};

type QuestionStartedPayload = {
  roomId: number;
  questionId: number;
  question: PublicQuestion;
  questionNumber: number;
  totalQuestions: number;
  durationMs: number | null;
  startsAt: string;
  endsAt: string | null;
};

type TimerPayload = {
  roomId: number;
  remainingMs: number;
};

type RoomLeftPayload = {
  roomId: number;
  userId: number;
};

type RoomClosedPayload = {
  roomId: number;
  reason: string;
};

type GameEndedPayload = {
  roomId: number;
  reason: string;
  winnerUserId: number | null;
  leaderboard: GameState["leaderboard"];
};

type ChatMessagePayload = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

type ChatHistoryPayload = {
  roomId: number;
  messages: ChatMessagePayload[];
};

type RoomConfigForm = {
  name: string;
  gameType: "wordle" | "memory";
  wordleWordLength: number;
  wordleMaxAttempts: number;
  memoryPairsCount: number;
};

const DEFAULT_FORM: RoomConfigForm = {
  name: "",
  gameType: "wordle",
  wordleWordLength: 5,
  wordleMaxAttempts: 6,
  memoryPairsCount: 8,
};

function formatRemainingTime(remainingMs: number | null, fallbackMs: number | null) {
  if (remainingMs === null && fallbackMs === null) {
    return "Illimite";
  }

  const source = remainingMs ?? fallbackMs ?? 0;
  return `${Math.max(0, Math.ceil(source / 1000))} sec`;
}

function formatRoomStatus(status: Room["status"]) {
  if (status === "waiting") {
    return "En attente";
  }

  if (status === "playing") {
    return "En cours";
  }

  return "Terminee";
}

export default function RoomPage() {
  const { roomId: roomIdParam } = useParams();
  const roomId = Number(roomIdParam);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const [room, setRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomConfigForm>(DEFAULT_FORM);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] = useState(false);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessagePayload[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomClosedReason, setRoomClosedReason] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const refreshRoom = async () => {
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    setPageError(null);

    try {
      const fetchedRoom = await getRoomById(roomId);
      setRoom(fetchedRoom);
      setForm(buildFormFromRoom(fetchedRoom));
      setRoomClosedReason(null);
      setGameState(await getGameState(roomId));
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Impossible de rafraichir cette room.",
      );
    }
  };

  useEffect(() => {
    const loadRoomPage = async () => {
      if (!Number.isFinite(roomId) || roomId <= 0) {
        setPageError("URL de room invalide.");
        setIsLoadingPage(false);
        return;
      }

      setIsLoadingPage(true);
      setPageError(null);
      setRoomActionError(null);
      setRoomClosedReason(null);

      try {
        const [fetchedRoom, fetchedGameState] = await Promise.all([
          getRoomById(roomId),
          getGameState(roomId),
        ]);

        setRoom(fetchedRoom);
        setForm(buildFormFromRoom(fetchedRoom));
        setGameState(fetchedGameState);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de charger cette room.";
        setPageError(message);
      } finally {
        setIsLoadingPage(false);
      }
    };

    void loadRoomPage();
  }, [roomId]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    if (user) {
      void connectWs().catch(() => {
        // Action-level flows already surface feedback.
      });
      return;
    }

    disconnectWs();
  }, [isSessionLoading, user]);

  useEffect(() => {
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    const handleRoomJoined = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
      setRoomActionError(null);
      setRoomClosedReason(null);
      void refreshRoom();
    };

    const handleRoomState = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
      setRoomActionError(null);
      setRoomClosedReason(null);
      void refreshRoom();
    };

    const handleRoomStarted = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setIsStarting(false);
      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
      setRoomActionError(null);
      void refreshRoom();
    };

    const handleRoomLeft = (response: WsResponse<RoomLeftPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      if (user && response.data.userId === user.id) {
        setIsLeaving(false);
        navigate("/");
        return;
      }

      void refreshRoom();
    };

    const handleRoomClosed = (response: WsResponse<RoomClosedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setRoom(null);
      setGameState(null);
      setCurrentQuestion(null);
      setRemainingMs(null);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      setChatMessages([]);
      setChatInput("");
      setChatError(null);
      setRoomClosedReason("Cette room n'est plus active. Reviens a l'accueil pour en ouvrir une nouvelle.");
    };

    const handleQuestionStarted = (response: WsResponse<QuestionStartedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setCurrentQuestion(response.data.question);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      setRemainingMs(response.data.durationMs);
    };

    const handleTimer = (response: WsResponse<TimerPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setRemainingMs(response.data.remainingMs);
    };

    const handleGameState = (response: WsResponse<GameState>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setGameState(response.data);
    };

    const handleGameEnded = (response: WsResponse<GameEndedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setCurrentQuestion(null);
      setRemainingMs(null);
      setHasAnsweredCurrentQuestion(false);
      setSelectedAnswer(null);
      setGameState((currentState) =>
        currentState
          ? {
              ...currentState,
              status: "finished",
              leaderboard: response.data.leaderboard,
              winnerUserId: response.data.winnerUserId,
            }
          : currentState,
      );
      void refreshRoom();
    };

    const handleChatHistory = (response: WsResponse<ChatHistoryPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setChatMessages(response.data.messages);
    };

    const handleChatMessage = (response: WsResponse<ChatMessagePayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      const message = response.data;
      setChatMessages((currentMessages) => [...currentMessages, message]);
      setChatError(null);
    };

    const handleChatError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setChatError(response.error?.message ?? "Envoi du message impossible.");
    };

    const handleRoomError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setIsStarting(false);
      setIsLeaving(false);
      setRoomActionError(response.error?.message ?? "Action room impossible.");
    };

    onWs("room:joined", handleRoomJoined);
    onWs("room:state", handleRoomState);
    onWs("room:left", handleRoomLeft);
    onWs("room:started", handleRoomStarted);
    onWs("room:closed", handleRoomClosed);
    onWs("room:join:error", handleRoomError);
    onWs("room:start:error", handleRoomError);
    onWs("room:leave:error", handleRoomError);
    onWs("game:answer:error", handleRoomError);
    onWs("chat:history", handleChatHistory);
    onWs("chat:message", handleChatMessage);
    onWs("chat:message:error", handleChatError);
    onWs("game:question:started", handleQuestionStarted);
    onWs("game:timer", handleTimer);
    onWs("game:state", handleGameState);
    onWs("game:ended", handleGameEnded);

    return () => {
      offWs("room:joined", handleRoomJoined);
      offWs("room:state", handleRoomState);
      offWs("room:left", handleRoomLeft);
      offWs("room:started", handleRoomStarted);
      offWs("room:closed", handleRoomClosed);
      offWs("room:join:error", handleRoomError);
      offWs("room:start:error", handleRoomError);
      offWs("room:leave:error", handleRoomError);
      offWs("game:answer:error", handleRoomError);
      offWs("chat:history", handleChatHistory);
      offWs("chat:message", handleChatMessage);
      offWs("chat:message:error", handleChatError);
      offWs("game:question:started", handleQuestionStarted);
      offWs("game:timer", handleTimer);
      offWs("game:state", handleGameState);
      offWs("game:ended", handleGameEnded);
    };
  }, [navigate, roomId, user]);

  useEffect(() => {
    const userIds = new Set<number>();

    room?.players.forEach((player) => userIds.add(player.userId));
    gameState?.leaderboard.forEach((entry) => userIds.add(entry.userId));
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
  }, [chatMessages, gameState, room]);

  useEffect(() => {
    if (!gameState?.questionEndsAt) {
      return;
    }

    const updateTimer = () => {
      const nextRemainingMs = new Date(gameState.questionEndsAt as string).getTime() - Date.now();
      setRemainingMs(Math.max(0, nextRemainingMs));
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState?.questionEndsAt]);

  const isOwner = Boolean(user && room && room.ownerUserId === user.id);
  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

  const canStart = useMemo(() => {
    if (!room || !user || room.ownerUserId !== user.id || room.status !== "waiting") {
      return false;
    }

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

  const scoreboard = useMemo(() => {
    const baseEntries =
      gameState?.leaderboard.length && gameState.leaderboard.length > 0
        ? gameState.leaderboard
        : room?.players.map((player) => ({
            userId: player.userId,
            score: 0,
          })) ?? [];

    return [...baseEntries]
      .sort((left, right) => right.score - left.score || left.userId - right.userId)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        username: playerNames[entry.userId] ?? `Joueur #${entry.userId}`,
      }));
  }, [gameState, playerNames, room]);

  const chatEntries = useMemo(
    () =>
      chatMessages.map((message) => ({
        ...message,
        username: playerNames[message.userId] ?? `Joueur #${message.userId}`,
        isSelf: message.userId === user?.id,
      })),
    [chatMessages, playerNames, user?.id],
  );

  const handleSave = async () => {
    if (!room) {
      return;
    }

    setIsSaving(true);
    setPageError(null);

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
      toast.success("Configuration enregistree");
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

  const joinRoom = async () => {
    if (!user || !room) {
      navigate("/login");
      return;
    }

    try {
      setRoomActionError(null);
      await connectWs();
      emitWs("room:join", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setRoomActionError(
        error instanceof Error
          ? error.message
          : "Connexion temps reel impossible pour rejoindre la room.",
      );
    }
  };

  const leaveRoom = async () => {
    if (!user || !room || !isUserInRoom) {
      return;
    }

    try {
      setIsLeaving(true);
      setRoomActionError(null);
      await connectWs();
      emitWs("room:leave", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsLeaving(false);
      setRoomActionError(
        error instanceof Error
          ? error.message
          : "Connexion temps reel impossible pour quitter la room.",
      );
    }
  };

  const startRoom = async () => {
    if (!user || !room || !isUserInRoom) {
      return;
    }

    try {
      setIsStarting(true);
      setRoomActionError(null);
      await connectWs();
      emitWs("room:start", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsStarting(false);
      setRoomActionError(
        error instanceof Error
          ? error.message
          : "Connexion temps reel impossible pour lancer la room.",
      );
    }
  };

  const submitAnswer = async () => {
    if (!user || !room || !currentQuestion || selectedAnswer === null || !isUserInRoom) {
      return;
    }

    try {
      setRoomActionError(null);
      await connectWs();
      emitWs("game:answer", {
        roomId: room.id,
        userId: user.id,
        questionId: currentQuestion.id,
        answerIndex: selectedAnswer,
      });
      setHasAnsweredCurrentQuestion(true);
    } catch (error) {
      setRoomActionError(
        error instanceof Error
          ? error.message
          : "Connexion temps reel impossible pour envoyer la reponse.",
      );
    }
  };

  const sendChatMessage = async () => {
    if (!user || !room || !isUserInRoom || chatInput.trim().length === 0) {
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      {isLoadingPage ? (
        <div className="rounded-[2rem] border border-slate-900/10 bg-white/70 p-8 text-slate-600">
          Chargement de la room...
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-700">
          {pageError}
        </div>
      ) : null}

      {roomClosedReason ? (
        <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-2xl font-semibold">Room fermee</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900/80">{roomClosedReason}</p>
          <div className="mt-5">
            <Link to="/">
              <PrimaryButton>Retour a l'accueil</PrimaryButton>
            </Link>
          </div>
        </section>
      ) : null}

      {!isLoadingPage && !pageError && room ? (
        <>
          <section className="grid gap-8 rounded-[2.75rem] border border-slate-900/10 bg-white/78 px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                  /rooms/{room.id}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
                  {room.gameType ?? "mini-game"}
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-semibold text-slate-950 md:text-5xl">
                {room.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                Ici, tu configures la room, lances la partie, joues en direct et
                suis le classement des joueurs en temps reel.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
                  {formatRoomStatus(room.status)}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.players.length} joueur{room.players.length > 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.gameType === "wordle" ? "Wordle" : room.gameType === "memory" ? "Memory" : "A configurer"}
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <SecondaryButton
                  className="justify-center"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/rooms/${room.id}`,
                    );
                    toast.success("Lien de room copie");
                  }}
                >
                  Copier le lien de la room
                </SecondaryButton>
                <SecondaryButton className="justify-center" onClick={() => void refreshRoom()}>
                  Rafraichir
                </SecondaryButton>
              </div>
            </div>

            <aside className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Controle de room
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                    Proprietaire
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {playerNames[room.ownerUserId] ?? `Joueur #${room.ownerUserId}`}
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                    Timer
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {formatRemainingTime(gameState?.questionDurationMs ?? null, null)}
                  </p>
                </div>

                {!user && !isSessionLoading ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-sm leading-7 text-white/72">
                      Connecte-toi pour rejoindre cette room, chatter et jouer en direct.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Link to="/login">
                        <PrimaryButton>Se connecter</PrimaryButton>
                      </Link>
                      <Link to="/register">
                        <SecondaryButton>Creer un compte</SecondaryButton>
                      </Link>
                    </div>
                  </div>
                ) : null}

                {user && !isUserInRoom && room.status === "waiting" ? (
                  <PrimaryButton className="w-full justify-center" onClick={joinRoom}>
                    Rejoindre cette room
                  </PrimaryButton>
                ) : null}

                {user && isUserInRoom ? (
                  <div className="flex flex-col gap-3">
                    {room.status === "waiting" && room.ownerUserId === user.id ? (
                      <PrimaryButton
                        className="w-full justify-center"
                        disabled={isStarting || !canStart}
                        onClick={startRoom}
                      >
                        {isStarting ? "Demarrage..." : "Lancer la partie"}
                      </PrimaryButton>
                    ) : null}
                    <SecondaryButton className="w-full justify-center" onClick={leaveRoom}>
                      {isLeaving ? "Sortie..." : "Quitter la room"}
                    </SecondaryButton>
                  </div>
                ) : null}

                {user && !isUserInRoom && room.status !== "waiting" ? (
                  <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
                    Cette room a deja demarre. Les nouveaux joueurs ne peuvent plus la rejoindre.
                  </div>
                ) : null}
              </div>
            </aside>
          </section>

          {isOwner && room.status === "waiting" ? (
            <section className="mt-8 rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Configuration
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Reglages de la room
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">Nom de la room</span>
                  <input
                    className="rounded-xl border border-slate-900/10 bg-white px-4 py-3 text-slate-950 outline-none"
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
                  <span className="text-sm font-medium text-slate-600">Type de jeu</span>
                  <select
                    className="rounded-xl border border-slate-900/10 bg-white px-4 py-3 text-slate-950 outline-none"
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
                      <span className="text-sm font-medium text-slate-600">
                        Longueur du mot (4-8)
                      </span>
                      <input
                        className="rounded-xl border border-slate-900/10 bg-white px-4 py-3 text-slate-950 outline-none"
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
                      <span className="text-sm font-medium text-slate-600">
                        Essais max (3-10)
                      </span>
                      <input
                        className="rounded-xl border border-slate-900/10 bg-white px-4 py-3 text-slate-950 outline-none"
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
                    <span className="text-sm font-medium text-slate-600">
                      Nombre de paires (2-20)
                    </span>
                    <input
                      className="rounded-xl border border-slate-900/10 bg-white px-4 py-3 text-slate-950 outline-none"
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
              </div>
            </section>
          ) : null}

          {roomActionError ? (
            <section className="mt-8 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {roomActionError}
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Joueurs de la room
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  Roster en direct
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {room.players.map((player) => (
                    <div
                      key={`player-${player.userId}`}
                      className="rounded-[1.25rem] bg-slate-100/85 px-4 py-4"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {playerNames[player.userId] ?? `Joueur #${player.userId}`}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {room.ownerUserId === player.userId ? "Owner" : "Player"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Leaderboard
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  Classement de la room
                </h2>
                <div className="mt-6 space-y-3">
                  {scoreboard.length > 0 ? (
                    scoreboard.map((entry) => (
                      <div
                        key={`score-${entry.userId}`}
                        className="flex items-center justify-between rounded-[1.25rem] bg-slate-100/85 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            #{entry.rank} {entry.username}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            User {entry.userId}
                          </p>
                        </div>
                        <span className="text-lg font-semibold text-slate-950">
                          {entry.score}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] bg-slate-100/85 px-4 py-4 text-sm text-slate-600">
                      La room n'a pas encore de score.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {gameState?.status === "playing" && currentQuestion ? (
                <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                        Manche {gameState.currentQuestionNumber}/{gameState.totalQuestions}
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold">{currentQuestion.text}</h2>
                    </div>
                    <div className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
                      {formatRemainingTime(remainingMs, gameState.questionDurationMs)}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={`answer-${currentQuestion.id}-${index + 1}`}
                        className={[
                          "rounded-[1.5rem] border px-5 py-5 text-left transition",
                          selectedAnswer === index
                            ? "border-amber-400 bg-amber-400/16"
                            : "border-white/12 bg-white/5 hover:bg-white/10",
                        ].join(" ")}
                        type="button"
                        disabled={!isUserInRoom || hasAnsweredCurrentQuestion}
                        onClick={() => setSelectedAnswer(index)}
                      >
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                          Option {index + 1}
                        </span>
                        <span className="mt-3 block text-base font-medium text-white">
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <PrimaryButton
                      disabled={
                        !isUserInRoom || selectedAnswer === null || hasAnsweredCurrentQuestion
                      }
                      onClick={submitAnswer}
                    >
                      {hasAnsweredCurrentQuestion ? "Reponse envoyee" : "Valider ma reponse"}
                    </PrimaryButton>
                    <p className="text-sm text-white/68">
                      {isUserInRoom
                        ? "Bonne reponse a trouver avant la fin du timer."
                        : "Tu dois etre dans la room pour repondre au mini-jeu."}
                    </p>
                  </div>
                </section>
              ) : (
                <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Zone de jeu
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                    Le plateau s'affiche ici
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {room.status === "waiting"
                      ? "Des que le proprietaire lance la room, la question en cours apparait ici."
                      : room.status === "finished"
                        ? "La partie est terminee. Le classement final reste visible a gauche."
                        : "Connexion au flux de jeu en cours..."}
                  </p>
                </section>
              )}

              {room.status === "finished" ? (
                <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Partie terminee
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    La room a termine sa partie.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-emerald-800/85">
                    Le classement final reste visible ici. Tu peux revenir a l'accueil
                    pour ouvrir une nouvelle room partageable.
                  </p>
                </section>
              ) : null}

              <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Chat room
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  Discussion en direct
                </h2>

                <div className="mt-6 max-h-90 space-y-3 overflow-y-auto rounded-[1.5rem] bg-slate-100/80 p-4">
                  {chatEntries.length > 0 ? (
                    chatEntries.map((message, index) => (
                      <article
                        key={`${message.sentAt}-${message.userId}-${index}`}
                        className={[
                          "max-w-[88%] rounded-[1.25rem] px-4 py-3",
                          message.isSelf
                            ? "ml-auto bg-[linear-gradient(135deg,#f97316,#f59e0b)] text-white"
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
                    className="w-full rounded-[1.25rem] border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-amber-500"
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
                        void sendChatMessage();
                      }
                    }}
                  />
                  <PrimaryButton
                    className="justify-center"
                    disabled={!isUserInRoom || chatInput.trim().length === 0}
                    onClick={() => {
                      void sendChatMessage();
                    }}
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
          </section>
        </>
      ) : null}
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
