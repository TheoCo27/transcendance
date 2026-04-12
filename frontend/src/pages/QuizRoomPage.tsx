import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getGameState, type GameLeaderboardEntry, type GameState } from "../services/game";
import { getRoomsByQuizId, type Room } from "../services/rooms";
import { getQuizById, type Quiz } from "../services/quizzes";
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

type RoomListPayload = Room[];
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

function formatDurationLabel(questionDurationSec: number | null) {
  if (questionDurationSec === null) {
    return "Illimite";
  }
  return `${questionDurationSec} sec`;
}

function formatRemainingTime(remainingMs: number | null, fallbackMs: number | null) {
  if (remainingMs === null && fallbackMs === null) {
    return "Illimite";
  }

  const source = remainingMs ?? fallbackMs ?? 0;
  return `${Math.max(0, Math.ceil(source / 1000))} sec`;
}

export default function QuizRoomPage() {
  const { quizId: quizIdParam } = useParams();
  const quizId = Number(quizIdParam);
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] = useState(false);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const refreshRooms = async () => {
    if (!Number.isFinite(quizId) || quizId <= 0) {
      return;
    }

    const fetchedRooms = await getRoomsByQuizId(quizId);
    setRooms(fetchedRooms);
    setCurrentRoom((activeRoom) => {
      if (!activeRoom) {
        return activeRoom;
      }

      return fetchedRooms.find((room) => room.id === activeRoom.id) ?? activeRoom;
    });
  };

  const loadQuizPage = async () => {
    if (!Number.isFinite(quizId) || quizId <= 0) {
      setPageError("URL de quiz invalide.");
      setIsLoadingPage(false);
      return;
    }

    setIsLoadingPage(true);
    setPageError(null);

    try {
      const [fetchedQuiz, fetchedRooms] = await Promise.all([
        getQuizById(quizId),
        getRoomsByQuizId(quizId),
      ]);

      setQuiz(fetchedQuiz);
      setRooms(fetchedRooms);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Impossible de charger cette page quiz.",
      );
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    void loadQuizPage();
  }, [quizId]);

  useEffect(() => {
    if (user) {
      connectWs();
      return;
    }

    disconnectWs();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleRoomCreated = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.quizId !== quizId) {
        return;
      }

      setCurrentRoom(response.data);
      setRoomActionError(null);
      void refreshRooms();
    };

    const handleRoomJoined = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.quizId !== quizId) {
        return;
      }

      const room = response.data;
      setCurrentRoom(room);
      setRoomActionError(null);
      if (room.status !== "waiting") {
        void (async () => {
          const nextState = await getGameState(room.id);
          setGameState(nextState);
        })();
      }
      void refreshRooms();
    };

    const handleRoomState = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.quizId !== quizId) {
        return;
      }

      const room = response.data;
      setCurrentRoom((activeRoom) => {
        if (!activeRoom || activeRoom.id === room.id) {
          return room;
        }

        return activeRoom;
      });

      if (room.status !== "waiting") {
        void (async () => {
          try {
            const nextState = await getGameState(room.id);
            setGameState(nextState);
          } catch {
            // Ignore transient refresh failures here.
          }
        })();
      }

      void refreshRooms();
    };

    const handleRoomListUpdated = (response: WsResponse<RoomListPayload>) => {
      if (!response.success || !response.data) {
        return;
      }

      setRooms(response.data.filter((room) => room.quizId === quizId));
    };

    const handleRoomClosed = (response: WsResponse<RoomClosedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== currentRoom?.id) {
        return;
      }

      setCurrentRoom(null);
      setGameState(null);
      setCurrentQuestion(null);
      setRemainingMs(null);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      void refreshRooms();
    };

    const handleRoomLeft = (response: WsResponse<RoomLeftPayload>) => {
      if (!response.success || !response.data) {
        return;
      }

      if (response.data.roomId === currentRoom?.id && response.data.userId === user.id) {
        setCurrentRoom(null);
        setGameState(null);
        setCurrentQuestion(null);
        setRemainingMs(null);
        setSelectedAnswer(null);
        setHasAnsweredCurrentQuestion(false);
      }

      void refreshRooms();
    };

    const handleRoomStarted = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.quizId !== quizId) {
        return;
      }

      const room = response.data;
      setCurrentRoom(room);
      void (async () => {
        const nextState = await getGameState(room.id);
        setGameState(nextState);
      })();
    };

    const handleQuestionStarted = (response: WsResponse<QuestionStartedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== currentRoom?.id) {
        return;
      }

      setCurrentQuestion(response.data.question);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      setRemainingMs(response.data.durationMs);
    };

    const handleTimer = (response: WsResponse<TimerPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== currentRoom?.id) {
        return;
      }
      setRemainingMs(response.data.remainingMs);
    };

    const handleGameState = (response: WsResponse<GameState>) => {
      if (!response.success || !response.data || response.data.roomId !== currentRoom?.id) {
        return;
      }
      setGameState(response.data);
    };

    const handleGameEnded = (response: WsResponse<GameEndedPayload>) => {
      if (!response.success || !response.data || response.data.roomId !== currentRoom?.id) {
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
      void refreshRooms();
    };

    const handleRoomError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setRoomActionError(response.error?.message ?? "Action room impossible.");
    };

    onWs("room:created", handleRoomCreated);
    onWs("room:joined", handleRoomJoined);
    onWs("room:state", handleRoomState);
    onWs("room:list-updated", handleRoomListUpdated);
    onWs("room:closed", handleRoomClosed);
    onWs("room:left", handleRoomLeft);
    onWs("room:started", handleRoomStarted);
    onWs("room:create:error", handleRoomError);
    onWs("room:join:error", handleRoomError);
    onWs("room:start:error", handleRoomError);
    onWs("room:leave:error", handleRoomError);
    onWs("game:answer:error", handleRoomError);
    onWs("game:question:started", handleQuestionStarted);
    onWs("game:timer", handleTimer);
    onWs("game:state", handleGameState);
    onWs("game:ended", handleGameEnded);

    return () => {
      offWs("room:created", handleRoomCreated);
      offWs("room:joined", handleRoomJoined);
      offWs("room:state", handleRoomState);
      offWs("room:list-updated", handleRoomListUpdated);
      offWs("room:closed", handleRoomClosed);
      offWs("room:left", handleRoomLeft);
      offWs("room:started", handleRoomStarted);
      offWs("room:create:error", handleRoomError);
      offWs("room:join:error", handleRoomError);
      offWs("room:start:error", handleRoomError);
      offWs("room:leave:error", handleRoomError);
      offWs("game:answer:error", handleRoomError);
      offWs("game:question:started", handleQuestionStarted);
      offWs("game:timer", handleTimer);
      offWs("game:state", handleGameState);
      offWs("game:ended", handleGameEnded);
    };
  }, [currentRoom?.id, quizId, user]);

  useEffect(() => {
    const userIds = new Set<number>();

    currentRoom?.players.forEach((player) => userIds.add(player.userId));
    gameState?.leaderboard.forEach((entry) => userIds.add(entry.userId));

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
  }, [currentRoom, gameState]);

  useEffect(() => {
    if (!quiz || !gameState || gameState.status !== "playing" || gameState.currentQuestionId === null) {
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

  const scoreboard = useMemo(() => {
    const baseEntries =
      gameState?.leaderboard.length && gameState.leaderboard.length > 0
        ? gameState.leaderboard
        : currentRoom?.players.map((player) => ({
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
  }, [currentRoom, gameState, playerNames]);

  const waitingRooms = rooms.filter((room) => room.status === "waiting");
  const liveRooms = rooms.filter((room) => room.status === "playing");

  const createRoom = () => {
    if (!quiz || !user) {
      return;
    }

    setRoomActionError(null);
    emitWs("room:create", {
      name: quiz.title.slice(0, 40),
      rounds: quiz.questions.length,
      quizId: quiz.id,
      questionDurationSec: quiz.questionDurationSec,
      isPrivate: false,
      userId: user.id,
    });
  };

  const joinRoom = (roomId: number) => {
    if (!user) {
      return;
    }

    setRoomActionError(null);
    emitWs("room:join", {
      roomId,
      userId: user.id,
    });
  };

  const leaveRoom = () => {
    if (!user || !currentRoom) {
      return;
    }

    emitWs("room:leave", {
      roomId: currentRoom.id,
      userId: user.id,
    });
  };

  const startRoom = () => {
    if (!user || !currentRoom) {
      return;
    }

    setRoomActionError(null);
    emitWs("room:start", {
      roomId: currentRoom.id,
      userId: user.id,
    });
  };

  const submitAnswer = () => {
    if (!user || !currentRoom || !currentQuestion || selectedAnswer === null) {
      return;
    }

    emitWs("game:answer", {
      roomId: currentRoom.id,
      userId: user.id,
      questionId: currentQuestion.id,
      answerIndex: selectedAnswer,
    });
    setHasAnsweredCurrentQuestion(true);
  };

  const questionDurationSec =
    typeof quiz?.questionDurationSec === "number" ? quiz.questionDurationSec : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      {isLoadingPage ? (
        <div className="rounded-[2rem] border border-slate-900/10 bg-white/70 p-8 text-slate-600">
          Chargement du quiz...
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-700">
          {pageError}
        </div>
      ) : null}

      {!isLoadingPage && !pageError && quiz ? (
        <>
          <section className="grid gap-8 rounded-[2.75rem] border border-slate-900/10 bg-white/78 px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                /quiz/{quiz.id}
              </span>
              <h1 className="mt-6 text-4xl font-semibold text-slate-950 md:text-5xl">
                {quiz.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                Cette page est la room jouable du quiz. Partage son URL, cree une
                room ou rejoins une session deja ouverte.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
                  {quiz.questions.length} questions
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {formatDurationLabel(quiz.questionDurationSec)}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {waitingRooms.length} waiting / {liveRooms.length} live
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {user ? (
                  <PrimaryButton className="justify-center" onClick={createRoom}>
                    Creer une room pour ce quiz
                  </PrimaryButton>
                ) : (
                  <Link to="/login">
                    <PrimaryButton className="justify-center">
                      Se connecter pour jouer
                    </PrimaryButton>
                  </Link>
                )}
                <SecondaryButton
                  className="justify-center"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  Copier l'URL du quiz
                </SecondaryButton>
              </div>
            </div>

            <aside className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Apercu des questions
              </p>
              <div className="mt-5 space-y-4">
                {quiz.questions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-amber-200">
                      Question {question.position}
                    </p>
                    <p className="mt-3 text-base font-medium text-white">
                      {question.questionText}
                    </p>
                  </article>
                ))}
              </div>
            </aside>
          </section>

          {!user && !isSessionLoading ? (
            <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950">
              <h2 className="text-2xl font-semibold">Connexion requise pour jouer</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-amber-900/80">
                Cree un compte ou reconnecte-toi pour pouvoir ouvrir une room,
                rejoindre la partie et envoyer tes reponses en temps reel.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link to="/login">
                  <PrimaryButton>Se connecter</PrimaryButton>
                </Link>
                <Link to="/register">
                  <SecondaryButton>Creer un compte</SecondaryButton>
                </Link>
              </div>
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Rooms disponibles
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      Rejoindre la session
                    </h2>
                  </div>
                  <SecondaryButton onClick={() => void refreshRooms()}>
                    Rafraichir
                  </SecondaryButton>
                </div>

                <div className="mt-6 space-y-4">
                  {rooms.length > 0 ? (
                    rooms.map((room) => (
                      <article
                        key={room.id}
                        className="rounded-[1.5rem] border border-slate-900/10 bg-slate-50/85 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              Room #{room.id}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {room.players.length} joueur{room.players.length > 1 ? "s" : ""} /{" "}
                              {room.status}
                            </p>
                          </div>
                          {user ? (
                            <PrimaryButton
                              className="px-4 py-3 text-sm"
                              disabled={room.status === "finished"}
                              onClick={() => joinRoom(room.id)}
                            >
                              {room.status === "playing" ? "Rejoindre en live" : "Rejoindre"}
                            </PrimaryButton>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-900/12 px-4 py-6 text-sm text-slate-600">
                      Aucune room ouverte pour ce quiz. Cree la premiere.
                    </div>
                  )}
                </div>

                {roomActionError ? (
                  <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {roomActionError}
                  </p>
                ) : null}
              </section>

              <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Leaderboard
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  Score de la room
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
              {currentRoom ? (
                <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Room active
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                        Room #{currentRoom.id}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {currentRoom.players.length} joueur{currentRoom.players.length > 1 ? "s" : ""} /
                        owner {currentRoom.ownerUserId ?? "?"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {currentRoom.status === "waiting" && currentRoom.ownerUserId === user?.id ? (
                        <PrimaryButton onClick={startRoom}>Lancer le quiz</PrimaryButton>
                      ) : null}
                      <SecondaryButton onClick={leaveRoom}>Quitter la room</SecondaryButton>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.5rem] bg-slate-100/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Joueurs connectes
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {currentRoom.players.map((player) => (
                        <div
                          key={`player-${player.userId}`}
                          className="rounded-[1.25rem] bg-white px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-slate-950">
                            {playerNames[player.userId] ?? `Joueur #${player.userId}`}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            User {player.userId}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-[2rem] border border-dashed border-slate-900/12 bg-white/70 p-8 text-slate-600">
                  Rejoins une room existante ou cree-en une pour lancer la partie.
                </section>
              )}

              {currentRoom && gameState?.status === "playing" && currentQuestion ? (
                <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                        Manche {gameState.currentQuestionNumber}/{gameState.totalQuestions}
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold">
                        {currentQuestion.text}
                      </h2>
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
                        disabled={hasAnsweredCurrentQuestion}
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
                      disabled={selectedAnswer === null || hasAnsweredCurrentQuestion}
                      onClick={submitAnswer}
                    >
                      {hasAnsweredCurrentQuestion ? "Reponse envoyee" : "Valider ma reponse"}
                    </PrimaryButton>
                    <p className="text-sm text-white/68">
                      Bonne reponse a trouver avant la fin du timer.
                    </p>
                  </div>
                </section>
              ) : null}

              {currentRoom && gameState?.status === "finished" ? (
                <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Partie terminee
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    Quiz boucle, room prete pour le recap.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-emerald-800/85">
                    Le classement final est affiche a gauche. Tu peux quitter la room
                    puis en recreer une nouvelle pour relancer la session.
                  </p>
                </section>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
