import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getGameState, type GameLeaderboardEntry, type GameState } from "../services/game";
import { getQuizById, type Quiz } from "../services/quizzes";
import { getRoomById, type Room } from "../services/rooms";
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
  leaderboard: GameLeaderboardEntry[];
};

type ChatMessagePayload = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

function formatDurationLabel(questionDurationMs: number | null) {
  if (questionDurationMs === null) {
    return "Illimite";
  }

  return `${Math.ceil(questionDurationMs / 1000)} sec`;
}

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
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
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

  const refreshRoom = async () => {
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    setPageError(null);

    try {
      const fetchedRoom = await getRoomById(roomId);
      setRoom(fetchedRoom);
      setRoomClosedReason(null);
      setGameState(await getGameState(roomId));
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Impossible de rafraichir cette room.",
      );
    }
  };

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
      const fetchedRoom = await getRoomById(roomId);
      if (typeof fetchedRoom.quizId !== "number") {
        throw new Error("Cette room n'est rattachee a aucun quiz.");
      }

      const [fetchedQuiz, fetchedGameState] = await Promise.all([
        getQuizById(fetchedRoom.quizId),
        getGameState(roomId),
      ]);

      setRoom(fetchedRoom);
      setQuiz(fetchedQuiz);
      setGameState(fetchedGameState);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Impossible de charger cette room.",
      );
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    void loadRoomPage();
  }, [roomId]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    if (user) {
      void connectWs().catch(() => {
        // The page surfaces action-level errors when an actual room action is attempted.
      });
      return;
    }

    disconnectWs();
  }, [isSessionLoading, user]);

  useEffect(() => {
    if (!user || !Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    const handleRoomJoined = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setRoomActionError(null);
      setRoomClosedReason(null);
      void (async () => {
        try {
          setGameState(await getGameState(roomId));
        } catch {
          // Ignore transient refresh failures after join.
        }
      })();
    };

    const handleRoomState = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setRoomActionError(null);
      setRoomClosedReason(null);
      void (async () => {
        try {
          setGameState(await getGameState(roomId));
        } catch {
          // Ignore transient refresh failures while the room state updates.
        }
      })();
    };

    const handleRoomStarted = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setRoomActionError(null);
      void (async () => {
        try {
          setGameState(await getGameState(roomId));
        } catch {
          // Ignore transient refresh failures here.
        }
      })();
    };

    const handleRoomLeft = (response: WsResponse<RoomLeftPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      if (response.data.userId === user.id) {
        setChatMessages([]);
        setChatInput("");
        setChatError(null);
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
      setRoomClosedReason("Cette room n'est plus active. Reviens au quiz pour en ouvrir une nouvelle.");
    };

    const handleQuestionStarted = (response: WsResponse<QuestionStartedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== roomId) {
        return;
      }

      setCurrentQuestion(response.data.question);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      setRemainingMs(response.data.durationMs);
      setRoomActionError(null);
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

      const endedGame = response.data;
      setCurrentQuestion(null);
      setRemainingMs(null);
      setHasAnsweredCurrentQuestion(false);
      setSelectedAnswer(null);
      setGameState((currentState) =>
        currentState
          ? {
              ...currentState,
              status: "finished",
              leaderboard: endedGame.leaderboard,
              winnerUserId: endedGame.winnerUserId,
            }
          : currentState,
      );
      void refreshRoom();
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
      offWs("chat:message", handleChatMessage);
      offWs("chat:message:error", handleChatError);
      offWs("game:question:started", handleQuestionStarted);
      offWs("game:timer", handleTimer);
      offWs("game:state", handleGameState);
      offWs("game:ended", handleGameEnded);
    };
  }, [roomId, user]);

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
    if (!quiz || !gameState || gameState.currentQuestionId === null) {
      return;
    }

    const matchingQuestion = quiz.questions.find(
      (question) => question.id === gameState.currentQuestionId,
    );

    if (!matchingQuestion) {
      return;
    }

    setCurrentQuestion({
      id: matchingQuestion.id,
      text: matchingQuestion.questionText,
      options: matchingQuestion.answers,
    });
  }, [quiz, gameState]);

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

  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

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

  const joinRoom = async () => {
    if (!user || !room) {
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
      setRoomActionError(null);
      await connectWs();
      emitWs("room:leave", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
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
      setRoomActionError(null);
      await connectWs();
      emitWs("room:start", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
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

      {roomClosedReason && quiz ? (
        <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-2xl font-semibold">Room fermee</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900/80">{roomClosedReason}</p>
          <div className="mt-5">
            <Link to={`/quiz/${quiz.id}`}>
              <PrimaryButton>Retour au quiz</PrimaryButton>
            </Link>
          </div>
        </section>
      ) : null}

      {!isLoadingPage && !pageError && room && quiz ? (
        <>
          <section className="grid gap-8 rounded-[2.75rem] border border-slate-900/10 bg-white/78 px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                  /rooms/{room.id}
                </span>
                <Link
                  className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700"
                  to={`/quiz/${quiz.id}`}
                >
                  Retour au quiz
                </Link>
              </div>

              <h1 className="mt-6 text-4xl font-semibold text-slate-950 md:text-5xl">
                {quiz.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                Voici l'URL partageable de la room. C'est ici que se jouent la partie,
                le chat en direct et le classement live des joueurs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
                  {formatRoomStatus(room.status)}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {room.players.length} joueur{room.players.length > 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {formatDurationLabel(room.questionDurationMs)}
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <SecondaryButton
                  className="justify-center"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  Copier l'URL de la room
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
                    Owner
                  </p>
                  <p className="mt-3 text-base font-medium text-white">
                    {room.ownerUserId
                      ? playerNames[room.ownerUserId] ?? `Joueur #${room.ownerUserId}`
                      : "Aucun"}
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                    Quiz
                  </p>
                  <p className="mt-3 text-base font-medium text-white">{quiz.questions.length} questions</p>
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
                      <PrimaryButton className="w-full justify-center" onClick={startRoom}>
                        Lancer le quiz
                      </PrimaryButton>
                    ) : null}
                    <SecondaryButton className="w-full justify-center" onClick={leaveRoom}>
                      Quitter la room
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
                        : "Tu dois etre dans la room pour repondre au quiz."}
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
                      ? "Des que l'owner lance la room, la question en cours apparait ici."
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
                    La room a boucle son quiz.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-emerald-800/85">
                    Le classement final reste visible ici. Tu peux revenir au quiz
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
                        sendChatMessage();
                      }
                    }}
                  />
                  <PrimaryButton
                    className="justify-center"
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
          </section>
        </>
      ) : null}
    </main>
  );
}
