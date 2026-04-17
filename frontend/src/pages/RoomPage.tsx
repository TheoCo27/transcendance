import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import Input from "../components/ui/input";
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

type RoomConfigForm = {
  name: string;
  quizId: number | null;
  gameType: "wordle" | "memory" | "quiz";
  wordleWordLength: number;
  wordleMaxAttempts: number;
  memoryPairsCount: number;
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

function formatChatTime(sentAt: string): string {
  const parsed = new Date(sentAt);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
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
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

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

  const chatEntries = useMemo(
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      {isLoadingPage ? (
        <div className="rounded-4xl border border-slate-900/10 bg-white/70 p-8 text-slate-600">
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
                  className="justify-center"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/rooms/${room.id}`,
                    );
                    toast.success(
                      "Le lien de la room a été copié dans le presse-papier.",
                    );
                  }}
                >
                  Copier le lien de la room
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
            <section className="mt-8 rounded-4xl border border-white/10 bg-surface text-text p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                Configuration
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-text-muted">
                Réglages de la room
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Nom de la room</span>
                  <Input
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
                  <span className="text-sm font-medium">Type de jeu</span>
                  <select
                    className="rounded-xl border border-white/10 bg-bg px-4 py-3 outline-none placeholder:text-text/40"
                    value={form.gameType}
                    onChange={(event) => {
                      const gameType = event.target.value as
                        | "wordle"
                        | "memory"
                        | "quiz";
                      setForm((previous) => ({ ...previous, gameType }));
                    }}
                  >
                    <option value="wordle">Wordle</option>
                    <option value="memory">Memory</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </label>

                {form.gameType === "quiz" ? (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">Choix du quiz</p>

                    {isLoadingQuizzes ? (
                      <p className="mt-3 rounded-xl border border-white/10 bg-bg px-4 py-3 text-sm text-slate-300">
                        Chargement des quiz...
                      </p>
                    ) : availableQuizzes.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                        Aucun quiz disponible pour l'instant. Cree un quiz avant
                        de le selectionner ici.
                      </p>
                    ) : (
                      <div className="mt-3 grid max-h-46 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                        {availableQuizzes.map((quiz) => {
                          const isSelected = form.quizId === quiz.id;

                          return (
                            <button
                              key={`quiz-choice-${quiz.id}`}
                              className={[
                                "flex items-start justify-between rounded-xl border px-3 py-2.5 text-left transition",
                                isSelected
                                  ? "border-amber-300 bg-amber-300/12"
                                  : "border-white/10 bg-bg hover:bg-white/5",
                              ].join(" ")}
                              type="button"
                              onClick={() => {
                                setForm((previous) => ({
                                  ...previous,
                                  quizId:
                                    previous.quizId === quiz.id
                                      ? null
                                      : quiz.id,
                                }));
                              }}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-muted">
                                  {quiz.title}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {quiz.questions.length} question
                                  {quiz.questions.length > 1 ? "s" : ""}
                                </p>
                              </div>

                              <span
                                aria-hidden="true"
                                className={[
                                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                                  isSelected
                                    ? "border-amber-300 bg-amber-300/20 text-amber-100"
                                    : "border-white/20 text-transparent",
                                ].join(" ")}
                              >
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : form.gameType === "wordle" ? (
                  <>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        Longueur du mot (4-8)
                      </span>
                      <Input
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
                      <span className="text-sm font-medium ">
                        Essais max (3-10)
                      </span>
                      <Input
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
                    <span className="text-sm font-medium">
                      Nombre de paires (2-20)
                    </span>
                    <Input
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
            <section className="mt-8 rounded-4xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {roomActionError}
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] xl:grid-cols-[0.8fr_1.2fr] xl:items-stretch">
            <div className="flex flex-col gap-6 xl:min-h-full">
              <section className="rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Joueurs de la room
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-text-muted">
                  Roster en direct
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {room.players.map((player) => (
                    <div
                      key={`player-${player.userId}`}
                      className="rounded-[1.25rem] border border-white/10 bg-bg px-4 py-4"
                    >
                      <p className="text-sm font-semibold text-text-muted">
                        {playerNames[player.userId] ??
                          `Joueur #${player.userId}`}
                      </p>
                      <p className="mt-1 text-xs uppercase text-slate-500">
                        {room.ownerUserId === player.userId
                          ? "Owner"
                          : "Player"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] xl:flex xl:flex-1 xl:flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Leaderboard
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-text-muted">
                  Classement de la room
                </h2>
                <div className="mt-6 space-y-3 xl:flex-1">
                  {scoreboard.length > 0 ? (
                    scoreboard.map((entry) => (
                      <div
                        key={`score-${entry.userId}`}
                        className="flex items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center justify-between rounded-[1.25rem] border border-white/10 bg-bg px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              alt={`Avatar de ${entry.username}`}
                              avatarUrl={entry.avatarUrl}
                              className="h-10 w-10 shrink-0 border border-white/15"
                              fallbackClassName="text-xs"
                              username={entry.username}
                            />
                            <p className="truncate text-sm font-medium text-text-muted">
                              {entry.username}
                            </p>
                          </div>

                          <span className="rounded-full bg-white/8 px-3 py-1 text-base font-semibold">
                            {entry.score}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-white/10 bg-bg px-4 py-4 text-sm">
                      La room n'a pas encore de score.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-6 xl:min-h-full">
              {gameState?.status === "playing" && currentQuestion ? (
                <section className="rounded-4xl bg-slate-950 p-6 text-text shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                        Manche {gameState.currentQuestionNumber}/
                        {gameState.totalQuestions}
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold">
                        {currentQuestion.text}
                      </h2>
                    </div>
                    <div className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
                      {formatRemainingTime(
                        remainingMs,
                        gameState.questionDurationMs,
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={`answer-${currentQuestion.id}-${index + 1}`}
                        className={[
                          "rounded-3xl border px-5 py-5 text-left transition",
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
                        !isUserInRoom ||
                        selectedAnswer === null ||
                        hasAnsweredCurrentQuestion
                      }
                      onClick={submitAnswer}
                    >
                      {hasAnsweredCurrentQuestion
                        ? "Réponse envoyée"
                        : "Valider ma réponse"}
                    </PrimaryButton>
                    <p className="text-sm text-white/68">
                      {isUserInRoom
                        ? "Bonne réponse à trouver avant la fin du timer."
                        : "Tu dois être dans la room pour répondre au mini-jeu."}
                    </p>
                  </div>
                </section>
              ) : (
                <section className="rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Zone de jeu
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-text-muted">
                    Le plateau s'affiche ici
                  </h2>
                  <p className="mt-4 text-sm leading-7">
                    {room.status === "waiting"
                      ? "Des que le proprietaire lance la room, la question en cours apparait ici."
                      : room.status === "finished"
                        ? "La partie est terminee. Le classement final reste visible a gauche."
                        : "Connexion au flux de jeu en cours..."}
                  </p>
                </section>
              )}

              {room.status === "finished" ? (
                <section className="rounded-4xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Partie terminee
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    La room a termine sa partie.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-emerald-800/85">
                    Le classement final reste visible ici. Tu peux revenir a
                    l'accueil pour ouvrir une nouvelle room partageable.
                  </p>
                </section>
              ) : null}

              <section className="rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Chat room
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-text-muted">
                  Discussion en direct
                </h2>

                <div className="mt-6 max-h-90 space-y-4 overflow-y-auto overflow-x-hidden rounded-3xl border border-white/10 bg-bg p-4">
                  {chatEntries.length > 0 ? (
                    chatEntries.map((message, index) => {
                      const previousMessage = chatEntries[index - 1];
                      const showSenderMeta =
                        index === 0 ||
                        previousMessage.userId !== message.userId;
                      const sentTime = formatChatTime(message.sentAt);

                      return (
                        <article
                          key={`${message.sentAt}-${message.userId}-${index}`}
                        >
                          {showSenderMeta ? (
                            <div
                              className={[
                                "flex items-center gap-2",
                                message.isSelf
                                  ? "justify-end"
                                  : "justify-start",
                              ].join(" ")}
                            >
                              {message.isSelf ? (
                                <>
                                  <p className="text-xs font-medium text-slate-400/85">
                                    {sentTime}
                                  </p>
                                  <p className="text-sm font-medium text-slate-300">
                                    Moi
                                  </p>
                                  <Avatar
                                    alt={`Avatar de ${message.username}`}
                                    avatarUrl={message.avatarUrl}
                                    className="h-9 w-9 shrink-0 border border-white/15"
                                    fallbackClassName="text-xs"
                                    username={message.username}
                                  />
                                </>
                              ) : (
                                <>
                                  <Avatar
                                    alt={`Avatar de ${message.username}`}
                                    avatarUrl={message.avatarUrl}
                                    className="h-9 w-9 shrink-0 border border-white/15"
                                    fallbackClassName="text-xs"
                                    username={message.username}
                                  />
                                  <p className="text-sm font-medium text-slate-300">
                                    {message.username}
                                  </p>
                                  <p className="text-xs font-medium text-slate-400/85">
                                    {sentTime}
                                  </p>
                                </>
                              )}
                            </div>
                          ) : null}

                          <div
                            className={[
                              "max-w-[70%] rounded-2xl border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.2)]",
                              showSenderMeta ? "mt-2" : "mt-0",
                              message.isSelf
                                ? "ml-auto mr-11 border-white/15 bg-primary text-white"
                                : "ml-11 mr-auto border-amber-200/35 bg-accent text-amber-900",
                            ].join(" ")}
                          >
                            <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-6">
                              {message.content}
                            </p>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.25rem] bg-surface border border-white/10 px-4 py-4 text-sm">
                      Aucun message pour l'instant. Lance la conversation.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Input
                    className="w-full "
                    placeholder={
                      isUserInRoom
                        ? "Écrire un message a la room..."
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
