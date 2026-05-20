import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuizGameSection from "../components/room/QuizGameSection";
import SectionHeader from "../components/section-header";
import SectionLabel from "../components/section-label";
import PrimaryButton from "../components/ui/PrimaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getGameState, type GameState } from "../services/game";
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

function formatGameType(room: Room | null): string {
  if (!room?.gameType) {
    return "Aucun jeu";
  }

  if (room.gameType === "wordle") {
    return "Wordle";
  }

  if (room.gameType === "memory") {
    return "Memory";
  }

  return "Quiz";
}

function formatConfigValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

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

type GameEndedPayload = {
  roomId: number;
  reason: string;
  winnerUserId: number | null;
  leaderboard: GameState["leaderboard"];
};

type TimerPayload = {
  roomId: number;
  remainingMs: number;
};

export default function GamesPage() {
  const { roomId: roomIdParam } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const roomId = Number(roomIdParam);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(
    null,
  );
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [roomClosedReason, setRoomClosedReason] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadGamePage = async () => {
      if (!Number.isFinite(roomId) || roomId <= 0) {
        setPageError("URL de room invalide.");
        setIsLoadingPage(false);
        return;
      }

      setIsLoadingPage(true);
      setPageError(null);
      setRoomClosedReason(null);

      try {
        const [fetchedRoom, fetchedGameState] = await Promise.all([
          getRoomById(roomId),
          getGameState(roomId),
        ]);

        setRoom(fetchedRoom);
        setGameState(fetchedGameState);
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "Impossible de charger cette room.",
        );
      } finally {
        setIsLoadingPage(false);
      }
    };

    void loadGamePage();
  }, [roomId]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    if (user) {
      void connectWs().catch(() => {
        // Si le socket n'est pas dispo, la page reste lisible en HTTP.
      });
      return;
    }

    disconnectWs();
  }, [isSessionLoading, user]);

  useEffect(() => {
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    const handleRoomState = (response: WsResponse<Room>) => {
      const { data } = response;
      if (!response.success || !data || data.id !== roomId) {
        return;
      }

      setRoom(data);
    };

    const handleRoomClosed = (
      response: WsResponse<{ roomId: number; reason: string }>,
    ) => {
      const { data } = response;
      if (!response.success || !data || data.roomId !== roomId) {
        return;
      }

      setRoom(null);
      setGameState(null);
      setCurrentQuestion(null);
      setRemainingMs(null);
      setRoomClosedReason(data.reason);
    };

    const handleQuestionStarted = (
      response: WsResponse<QuestionStartedPayload>,
    ) => {
      const { data } = response;
      if (!response.success || !data || data.roomId !== roomId) {
        return;
      }

      setCurrentQuestion(data.question);
      setRemainingMs(data.durationMs);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
    };

    const handleTimer = (response: WsResponse<TimerPayload>) => {
      const { data } = response;
      if (!response.success || !data || data.roomId !== roomId) {
        return;
      }

      setRemainingMs(data.remainingMs);
    };

    const handleGameState = (response: WsResponse<GameState>) => {
      const { data } = response;
      if (!response.success || !data || data.roomId !== roomId) {
        return;
      }

      setGameState(data);
    };

    const handleGameEnded = (response: WsResponse<GameEndedPayload>) => {
      const { data } = response;
      if (!response.success || !data || data.roomId !== roomId) {
        return;
      }

      setCurrentQuestion(null);
      setRemainingMs(null);
      setGameState((currentState) =>
        currentState
          ? {
              ...currentState,
              status: "finished",
              leaderboard: data.leaderboard,
              winnerUserId: data.winnerUserId,
            }
          : currentState,
      );
    };

    onWs("room:state", handleRoomState);
    onWs("room:closed", handleRoomClosed);
    onWs("game:question:started", handleQuestionStarted);
    onWs("game:timer", handleTimer);
    onWs("game:state", handleGameState);
    onWs("game:ended", handleGameEnded);

    return () => {
      offWs("room:state", handleRoomState);
      offWs("room:closed", handleRoomClosed);
      offWs("game:question:started", handleQuestionStarted);
      offWs("game:timer", handleTimer);
      offWs("game:state", handleGameState);
      offWs("game:ended", handleGameEnded);
    };
  }, [roomId]);

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

  useEffect(() => {
    if (!room || gameState?.status !== "finished") {
      return;
    }

    navigate(`/rooms/${room.id}`, { replace: true });
  }, [gameState?.status, navigate, room]);

  useEffect(() => {
    if (!room) {
      return;
    }

    let isCancelled = false;

    const loadPlayerNames = async () => {
      const entries = await Promise.all(
        room.players.map(async (player) => {
          try {
            const fetchedUser = await getUserById(player.userId);
            return [player.userId, fetchedUser.username] as const;
          } catch {
            return [player.userId, `Joueur #${player.userId}`] as const;
          }
        }),
      );

      if (!isCancelled) {
        setPlayerNames(Object.fromEntries(entries));
      }
    };

    void loadPlayerNames();

    return () => {
      isCancelled = true;
    };
  }, [room]);

  const roomGameConfig = useMemo(() => {
    const config = room?.gameConfig;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return null;
    }

    return config as Record<string, unknown>;
  }, [room?.gameConfig]);

  const gameTypeLabel = useMemo(() => formatGameType(room), [room]);
  const roomConfigEntries = useMemo(
    () => Object.entries(roomGameConfig ?? {}),
    [roomGameConfig],
  );

  const playerNamesById = useMemo(() => playerNames, [playerNames]);

  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

  const handleSelectAnswer = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = async () => {
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
      await connectWs();
      emitWs("game:answer", {
        roomId: room.id,
        userId: user.id,
        questionId: currentQuestion.id,
        answerIndex: selectedAnswer,
      });
      setHasAnsweredCurrentQuestion(true);
    } catch {
      setPageError("Connexion temps réel impossible pour envoyer la réponse.");
    }
  };

  if (isLoadingPage) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <div className="rounded-4xl border border-white/10 bg-bg p-8 text-text">
          Chargement de la partie...
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-danger">
          {pageError}
        </div>
      </main>
    );
  }

  if (roomClosedReason) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <section className="rounded-4xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-2xl font-semibold">Partie fermée</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900/80">
            {roomClosedReason}
          </p>
          <div className="mt-5 flex gap-3">
            <Link to="/">
              <PrimaryButton>Retour à l'accueil</PrimaryButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="mx-auto flex flex-col w-full max-w-7xl flex-1 px-6 py-8 md:px-10 md:py-12 justify-center">
      <section className="flex flex-col gap-6">
        {room.gameType === "quiz" ? (
          <QuizGameSection
            roomStatus={room.status}
            gameState={gameState}
            currentQuestion={currentQuestion}
            remainingMs={remainingMs}
            isUserInRoom={isUserInRoom}
            selectedAnswer={selectedAnswer}
            hasAnsweredCurrentQuestion={hasAnsweredCurrentQuestion}
            onSelectAnswer={handleSelectAnswer}
            onSubmitAnswer={handleSubmitAnswer}
          />
        ) : room.gameType === "wordle" ? (
          <section className="flex flex-1 flex-col rounded-4xl border border-white/10 bg-surface p-6 text-text shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
            <SectionLabel className="text-slate-400">Jeux</SectionLabel>
            <SectionHeader>{room.gameType}</SectionHeader>
          </section>
        ) : (
          <section className="flex flex-1 flex-col rounded-4xl border border-white/10 bg-surface p-6 text-text shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
            <SectionLabel className="text-slate-400">Jeux</SectionLabel>
            <SectionHeader>{room.gameType}</SectionHeader>
          </section>
        )}
      </section>
    </main>
  );
}
