import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import RoomChatSection from "../components/room/RoomChatSection";
import RoomConfigSection from "../components/room/RoomConfigSection";
import RoomGameSection from "../components/room/RoomGameSection";
import RoomLeaderboardSection from "../components/room/RoomLeaderboardSection";
import RoomPlayersSection from "../components/room/RoomPlayersSection";
import type { ChatEntry, RoomConfigForm } from "../components/room/room-types";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useToast } from "../components/ui/toast";
import { useAuthSession } from "../hooks/useAuthSession";
import { getGameState, type GameState } from "../services/game";
import { getQuizzes, type Quiz } from "../services/quizzes";
import { getRoomById, updateRoom, type Room } from "../services/rooms";
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

const DEFAULT_FORM: RoomConfigForm = {
  name: "",
  quizId: null,
  gameType: "wordle",
  wordleWordLength: 5,
  wordleMaxAttempts: 6,
  memoryPairsCount: 8,
};

function formatRemainingTime(
  remainingMs: number | null,
  fallbackMs: number | null,
) {
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
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(
    null,
  );
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    useState(false);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [playerAvatars, setPlayerAvatars] = useState<
    Record<number, string | null>
  >({});
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
  const [isRoomLinkCopied, setIsRoomLinkCopied] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const roomLinkCopiedTimeoutRef = useRef<number | null>(null);

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
        error instanceof Error
          ? error.message
          : "Impossible de rafraichir cette room.",
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
          error instanceof Error
            ? error.message
            : "Impossible de charger cette room.";
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
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
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
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
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
      setRoomClosedReason(
        "Cette room n'est plus active. Reviens a l'accueil pour en ouvrir une nouvelle.",
      );
    };

    const handleQuestionStarted = (
      response: WsResponse<QuestionStartedPayload>,
    ) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setCurrentQuestion(response.data.question);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      setRemainingMs(response.data.durationMs);
    };

    const handleTimer = (response: WsResponse<TimerPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setRemainingMs(response.data.remainingMs);
    };

    const handleGameState = (response: WsResponse<GameState>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setGameState(response.data);
    };

    const handleGameEnded = (response: WsResponse<GameEndedPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      const gameEndedData = response.data;

      setCurrentQuestion(null);
      setRemainingMs(null);
      setHasAnsweredCurrentQuestion(false);
      setSelectedAnswer(null);
      setGameState((currentState) =>
        currentState
          ? {
              ...currentState,
              status: "finished",
              leaderboard: gameEndedData.leaderboard,
              winnerUserId: gameEndedData.winnerUserId,
            }
          : currentState,
      );
      void refreshRoom();
    };

    const handleChatHistory = (response: WsResponse<ChatHistoryPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setChatMessages(response.data.messages);
    };

    const handleChatMessage = (response: WsResponse<ChatMessagePayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
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

    const loadPlayerProfiles = async () => {
      const nextEntries = await Promise.all(
        [...userIds].map(async (userId) => {
          try {
            const fetchedUser = await getUserById(userId);
            return {
              userId,
              username: fetchedUser.username,
              avatarUrl: fetchedUser.avatar_url,
            };
          } catch {
            return {
              userId,
              username: `Joueur #${userId}`,
              avatarUrl: null,
            };
          }
        }),
      );

      setPlayerNames((currentNames) => ({
        ...currentNames,
        ...Object.fromEntries(
          nextEntries.map((entry) => [entry.userId, entry.username]),
        ),
      }));

      setPlayerAvatars((currentAvatars) => ({
        ...currentAvatars,
        ...Object.fromEntries(
          nextEntries.map((entry) => [entry.userId, entry.avatarUrl]),
        ),
      }));
    };

    void loadPlayerProfiles();
  }, [chatMessages, gameState, room]);

  useEffect(() => {
    if (
      !user ||
      !room ||
      room.ownerUserId !== user.id ||
      room.status !== "waiting"
    ) {
      return;
    }

    let isCancelled = false;
    setIsLoadingQuizzes(true);

    void getQuizzes()
      .then((quizzes) => {
        if (isCancelled) {
          return;
        }

        setAvailableQuizzes(quizzes);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setAvailableQuizzes([]);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingQuizzes(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [room, user]);

  useEffect(() => {
    if (!gameState?.questionEndsAt) {
      return;
    }

    const updateTimer = () => {
      const nextRemainingMs =
        new Date(gameState.questionEndsAt as string).getTime() - Date.now();
      setRemainingMs(Math.max(0, nextRemainingMs));
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState?.questionEndsAt]);

  useEffect(
    () => () => {
      if (roomLinkCopiedTimeoutRef.current !== null) {
        window.clearTimeout(roomLinkCopiedTimeoutRef.current);
      }
    },
    [],
  );

  const isOwner = Boolean(user && room && room.ownerUserId === user.id);
  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

  const canStart = useMemo(() => {
    if (
      !room ||
      !user ||
      room.ownerUserId !== user.id ||
      room.status !== "waiting"
    ) {
      return false;
    }

    if (form.gameType === "quiz") {
      return typeof form.quizId === "number" && form.quizId > 0;
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

  const isQuizSelectionSaved = useMemo(() => {
    if (!room || form.gameType !== "quiz") {
      return false;
    }

    return (
      room.gameType === "quiz" &&
      typeof room.quizId === "number" &&
      room.quizId > 0 &&
      form.quizId === room.quizId
    );
  }, [form.gameType, form.quizId, room]);

  const scoreboard = useMemo(() => {
    const baseEntries =
      gameState?.leaderboard.length && gameState.leaderboard.length > 0
        ? gameState.leaderboard
        : (room?.players.map((player) => ({
            userId: player.userId,
            score: 0,
          })) ?? []);

    return [...baseEntries]
      .sort(
        (left, right) => right.score - left.score || left.userId - right.userId,
      )
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        username: playerNames[entry.userId] ?? `Joueur #${entry.userId}`,
        avatarUrl: playerAvatars[entry.userId] ?? null,
      }));
  }, [gameState, playerAvatars, playerNames, room]);

  const chatEntries = useMemo<ChatEntry[]>(
    () =>
      chatMessages.map((message) => ({
        ...message,
        username: playerNames[message.userId] ?? `Joueur #${message.userId}`,
        avatarUrl: playerAvatars[message.userId] ?? null,
        isSelf: message.userId === user?.id,
      })),
    [chatMessages, playerAvatars, playerNames, user?.id],
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
          : form.gameType === "memory"
            ? {
                pairsCount: form.memoryPairsCount,
              }
            : undefined;

      const updatedRoom = await updateRoom(room.id, {
        name: form.name.trim(),
        quizId: form.quizId,
        gameType: form.gameType,
        gameConfig: nextConfig,
      });

      setRoom(updatedRoom);
      setForm(buildFormFromRoom(updatedRoom));
      toast.success("Configuration enregistrée");
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
    if (
      !user ||
      !room ||
      !currentQuestion ||
      selectedAnswer === null ||
      !isUserInRoom
    ) {
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

  const copyRoomLink = async () => {
    if (!room) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/rooms/${room.id}`,
      );

      setIsRoomLinkCopied(true);
    } catch {
      toast.error("Impossible de copier le lien de la room.");
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      {isLoadingPage ? (
        <div className="rounded-4xl border border-white/10 bg-bg p-8 text-text">
          Chargement de la room...
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-danger">
          {pageError}
        </div>
      ) : null}

      {roomClosedReason ? (
        <section className="mt-8 rounded-4xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-2xl font-semibold">Room fermée</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900/80">
            {roomClosedReason}
          </p>
          <div className="mt-5">
            <Link to="/">
              <PrimaryButton>Retour à l'accueil</PrimaryButton>
            </Link>
          </div>
        </section>
      ) : null}

      {!isLoadingPage && !pageError && room ? (
        <>
          <section className="grid gap-8 rounded-[2.75rem] border border-white/10 bg-surface text-text px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
                {room.gameType ?? "mini-game"}
              </span>

              <h1 className="mt-6 text-4xl font-semibold md:text-5xl text-text-muted">
                {room.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8">
                Ici, tu configures la room, lances la partie, joues en direct et
                suis le classement des joueurs en temps reel.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-amber-900">
                  {formatRoomStatus(room.status)}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.players.length} joueur
                  {room.players.length > 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.gameType === "wordle"
                    ? "Wordle"
                    : room.gameType === "memory"
                      ? "Memory"
                      : room.gameType === "quiz"
                        ? "Quiz"
                        : "A configurer"}
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <PrimaryButton
                  className="inline-flex items-center gap-2"
                  onClick={() => {
                    void copyRoomLink();
                  }}
                >
                  {isRoomLinkCopied
                    ? "Lien copié"
                    : "Copier le lien de la room"}
                  {isRoomLinkCopied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4 rotate-180" />
                  )}
                </PrimaryButton>
                <SecondaryButton onClick={() => void refreshRoom()}>
                  Rafraichir
                </SecondaryButton>
              </div>
            </div>

            <aside className="rounded-4xl bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Contrôle de room
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                    Propriétaire
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {playerNames[room.ownerUserId] ??
                      `Joueur #${room.ownerUserId}`}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                    Timer
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {formatRemainingTime(
                      gameState?.questionDurationMs ?? null,
                      null,
                    )}
                  </p>
                </div>

                {!user && !isSessionLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm leading-7 text-white/72">
                      Connecte-toi pour rejoindre cette room, chatter et jouer
                      en direct.
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
                  <PrimaryButton
                    className="w-full justify-center"
                    onClick={joinRoom}
                  >
                    Rejoindre cette room
                  </PrimaryButton>
                ) : null}

                {user && isUserInRoom ? (
                  <div className="flex flex-col gap-3">
                    {room.status === "waiting" &&
                    room.ownerUserId === user.id ? (
                      <PrimaryButton
                        className="w-full justify-center"
                        disabled={isStarting || !canStart}
                        onClick={startRoom}
                      >
                        {isStarting ? "Demarrage..." : "Lancer la partie"}
                      </PrimaryButton>
                    ) : null}
                    <SecondaryButton
                      className="w-full justify-center"
                      onClick={leaveRoom}
                    >
                      {isLeaving ? "Sortie..." : "Quitter la room"}
                    </SecondaryButton>
                  </div>
                ) : null}

                {user && !isUserInRoom && room.status !== "waiting" ? (
                  <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
                    Cette room a deja demarre. Les nouveaux joueurs ne peuvent
                    plus la rejoindre.
                  </div>
                ) : null}
              </div>
            </aside>
          </section>

          {isOwner && room.status === "waiting" ? (
            <RoomConfigSection
              form={form}
              setForm={setForm}
              availableQuizzes={availableQuizzes}
              isLoadingQuizzes={isLoadingQuizzes}
              isQuizSelectionSaved={isQuizSelectionSaved}
              isSaving={isSaving}
              onSave={() => {
                void handleSave();
              }}
            />
          ) : null}

          {roomActionError ? (
            <section className="mt-8 rounded-4xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {roomActionError}
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] xl:grid-cols-[0.8fr_1.2fr] xl:items-stretch">
            <div className="flex flex-col gap-6 xl:min-h-full">
              <RoomPlayersSection
                players={room.players}
                ownerUserId={room.ownerUserId}
                playerNames={playerNames}
              />

              <RoomLeaderboardSection entries={scoreboard} />
            </div>

            <div className="flex flex-col gap-6 xl:min-h-full">
              <RoomGameSection
                roomStatus={room.status}
                gameState={gameState}
                currentQuestion={currentQuestion}
                remainingMs={remainingMs}
                isUserInRoom={isUserInRoom}
                selectedAnswer={selectedAnswer}
                hasAnsweredCurrentQuestion={hasAnsweredCurrentQuestion}
                onSelectAnswer={setSelectedAnswer}
                onSubmitAnswer={submitAnswer}
              />

              <RoomChatSection
                entries={chatEntries}
                chatInput={chatInput}
                chatError={chatError}
                isUserInRoom={isUserInRoom}
                onChatInputChange={setChatInput}
                onSendMessage={() => {
                  void sendChatMessage();
                }}
              />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function buildFormFromRoom(room: Room): RoomConfigForm {
  const gameType = room.gameType ?? (room.quizId ? "quiz" : "wordle");
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
    quizId: room.quizId,
    gameType,
    wordleWordLength,
    wordleMaxAttempts,
    memoryPairsCount,
  };
}
