import { useLocalObservable } from "mobx-react-lite";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PuzzleStore from "../components/Wordle/PuzzleStore";
import { useToast } from "../components/ui/toast";
import { getUserFacingErrorMessage } from "../services/api";
import { getGameState, type GameState } from "../services/game";
import { getRoomById, type Room } from "../services/rooms";
import { getUserById } from "../services/users";
import {
  connectWs,
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";
import { useAuthSession } from "./useAuthSession";

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

type PersistedWordleState = {
  sharedWord: string;
  wordLength: number;
  maxAttempts: number;
  guesses: string[];
  currentGuess: number;
  startTime: number;
  totalTime: number;
  rulePanelClosed: boolean;
  endedByTimeout: boolean;
  won: boolean;
  lost: boolean;
};

function buildWordleStorageKey(roomId: number, userId: number): string {
  return `wordle:${roomId}:user:${userId}`;
}

function loadPersistedWordleState(
  roomId: number,
  userId: number,
): PersistedWordleState | null {
  try {
    const rawValue = window.localStorage.getItem(
      buildWordleStorageKey(roomId, userId),
    );
    if (!rawValue) return null;

    return JSON.parse(rawValue) as PersistedWordleState;
  } catch {
    return null;
  }
}

function persistWordleState(
  roomId: number,
  userId: number,
  snapshot: PersistedWordleState,
): void {
  window.localStorage.setItem(
    buildWordleStorageKey(roomId, userId),
    JSON.stringify(snapshot),
  );
}

function clearPersistedWordleState(roomId: number, userId: number): void {
  window.localStorage.removeItem(buildWordleStorageKey(roomId, userId));
}

export function formatGamesPageGameType(room: Room | null): string {
  if (!room?.gameType) {
    return "Aucun jeu";
  }

  if (room.gameType === "wordle") {
    return "Wordle";
  }

  return "Quiz";
}

type UseGamesPageOptions = {
  roomIdParam?: string;
};

export function useGamesPage({ roomIdParam }: UseGamesPageOptions = {}) {
  const { roomId: routeRoomId } = useParams();
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const roomId = Number(roomIdParam ?? routeRoomId);
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
  const [isRulesOpen, setRulesOpen] = useState(true);
  const hasFinishedWordleRef = useRef(false);
  const lastHydratedWordleKeyRef = useRef<string | null>(null);

  const store = useLocalObservable(() => PuzzleStore);
  const toast = useToast();
  const isRulesOpenRef = useRef(isRulesOpen);

  useEffect(() => {
    isRulesOpenRef.current = isRulesOpen;
  }, [isRulesOpen]);

  useEffect(() => {
    const handleKeyup = (e: KeyboardEvent) => store.handleKeyup(e);
    window.addEventListener("keyup", handleKeyup);

    const intervalId = setInterval(() => {
      if (isRulesOpenRef.current === false) store.checkTimeUp();
      if (store.currentGuess === store.maxAttempts || store.won) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      window.removeEventListener("keyup", handleKeyup);
      clearInterval(intervalId);
    };
  }, [store]);

  useEffect(() => {
    if (room?.gameType !== "wordle" || !room?.id) return;
    if (!store.won && !store.lost) return;
    if (hasFinishedWordleRef.current) return;

    hasFinishedWordleRef.current = true;

    const finalizeWordle = async () => {
      try {
        await connectWs();
        emitWs("game:finish", {
          roomId: room.id,
          won: store.won,
          attemptsUsed: store.currentGuess,
        });
      } catch (error) {
        hasFinishedWordleRef.current = false;
        setPageError(
          getUserFacingErrorMessage(
            error,
            "Impossible de finaliser la partie Wordle.",
          ),
        );
      }
    };

    void finalizeWordle();
  }, [room?.gameType, room?.id, store.currentGuess, store.lost, store.won]);

  useEffect(() => {
    if (store.ToastId === 0 || store.ToastMessage.trim().length === 0) {
      return;
    }

    if (store.ToastMessage.startsWith("Bravo,")) {
      toast.success(store.ToastMessage);
      return;
    }

    toast.error(store.ToastMessage);
  }, [store.ToastId, store.ToastMessage, toast]);

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
          getUserFacingErrorMessage(error, "Impossible de charger cette room."),
        );
      } finally {
        setIsLoadingPage(false);
      }
    };

    void loadGamePage();
  }, [roomId, user?.id]);

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
      void getGameState(roomId)
        .then((gs) => {
          setGameState(gs);
        })
        .catch(() => {
          // Ignore failures.
        });
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
    if (!room) {
      return;
    }

    let isCancelled = false;

    const loadPlayerNames = async () => {
      const entries = await Promise.all(
        room.players.map(async (player) => {
          try {
            const fetchedUser = await getUserById(player.userId);
            return [
              player.userId,
              fetchedUser.username.startsWith("guest-archived-")
                ? "Invité déconnecté"
                : fetchedUser.username,
            ] as const;
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

    return config as Record<string, number>;
  }, [room?.gameConfig]);

  const wordleState = gameState?.wordle ?? null;
  const sharedWord =
    room?.gameType === "wordle" && typeof wordleState?.sharedWord === "string"
      ? wordleState.sharedWord
      : null;

  useEffect(() => {
    if (room?.gameType === "wordle") {
      const configuredLength = roomGameConfig?.wordLength ?? store.nbr_letters;
      const configuredMaxAttempts =
        roomGameConfig?.maxAttempts ?? store.maxAttempts;
      const userId = user?.id;
      const hydrationKey =
        typeof sharedWord === "string" && typeof userId === "number"
          ? `${room.id}:${userId}:${sharedWord}:${configuredLength}:${configuredMaxAttempts}`
          : null;

      if (typeof sharedWord !== "string" || typeof userId !== "number") {
        return;
      }

      store.nbr_letters = configuredLength;
      store.maxAttempts = configuredMaxAttempts;

      if (lastHydratedWordleKeyRef.current === hydrationKey) {
        return;
      }

      const persistedState = loadPersistedWordleState(room.id, userId);
      const canRestore =
        persistedState?.sharedWord === sharedWord &&
        persistedState.wordLength === configuredLength &&
        persistedState.maxAttempts === configuredMaxAttempts &&
        Array.isArray(persistedState.guesses) &&
        persistedState.guesses.length === configuredMaxAttempts;

      if (canRestore && persistedState) {
        store.init(sharedWord);
        store.word = sharedWord;
        store.guesses = [...persistedState.guesses];
        store.currentGuess = Math.min(
          configuredMaxAttempts,
          Math.max(0, persistedState.currentGuess),
        );
        store.start_time = persistedState.startTime;
        store.total_time = persistedState.totalTime;
        store.rulePannelClosed = persistedState.rulePanelClosed;
        store.endedByTimeout = persistedState.endedByTimeout;
        setRulesOpen(!persistedState.rulePanelClosed);
      } else {
        store.init(sharedWord);
        setRulesOpen(true);
        clearPersistedWordleState(room.id, userId);
      }

      store.checkTimeUp();
      hasFinishedWordleRef.current = false;
      lastHydratedWordleKeyRef.current = hydrationKey;
    }
  }, [
    room?.id,
    room?.gameType,
    roomGameConfig?.wordLength,
    roomGameConfig?.maxAttempts,
    sharedWord,
    store,
    user?.id,
  ]);

  useEffect(() => {
    if (
      room?.gameType !== "wordle" ||
      typeof room.id !== "number" ||
      typeof user?.id !== "number" ||
      typeof sharedWord !== "string"
    ) {
      return;
    }

    if (room.status !== "playing" || gameState?.status === "finished") {
      clearPersistedWordleState(room.id, user.id);
      return;
    }

    persistWordleState(room.id, user.id, {
      sharedWord,
      wordLength: store.nbr_letters,
      maxAttempts: store.maxAttempts,
      guesses: [...store.guesses],
      currentGuess: store.currentGuess,
      startTime: store.start_time,
      totalTime: store.total_time,
      rulePanelClosed: store.rulePannelClosed && !isRulesOpen,
      endedByTimeout: store.endedByTimeout,
      won: store.won,
      lost: store.lost,
    });

    if (
      store.start_time < 0 &&
      !store.won &&
      !store.lost &&
      !store.endedByTimeout
    ) {
      return;
    }

    void connectWs()
      .then(() => {
        emitWs("game:progress", {
          roomId: room.id,
          currentGuess: store.currentGuess,
          startTime: Math.max(0, Math.floor(store.start_time)),
          timePerWordSeconds: store.time_per_word,
          won: store.won,
          lost: store.lost,
          endedByTimeout: store.endedByTimeout,
        });
      })
      .catch(() => {
        // Local snapshot still keeps latest progress.
      });
  }, [
    gameState?.status,
    isRulesOpen,
    room?.gameType,
    room?.id,
    room?.status,
    sharedWord,
    store.currentGuess,
    store.endedByTimeout,
    store.guesses.join("|"),
    store.maxAttempts,
    store.nbr_letters,
    store.rulePannelClosed,
    store.start_time,
    store.total_time,
    user?.id,
  ]);

  useEffect(() => {
    if (
      room?.gameType !== "wordle" ||
      typeof room?.id !== "number" ||
      typeof user?.id !== "number"
    ) {
      return;
    }

    if (room.status === "waiting" || gameState?.status === "finished") {
      clearPersistedWordleState(room.id, user.id);
      lastHydratedWordleKeyRef.current = null;
    }
  }, [gameState?.status, room?.gameType, room?.id, room?.status, user?.id]);

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

  const handleSetReady = async () => {
    if (!room) {
      return;
    }

    try {
      await connectWs();
      emitWs("room:ready", {
        roomId: room.id,
      });
    } catch {
      setPageError(
        "Connexion temps réel impossible pour confirmer votre disponibilité.",
      );
    }
  };

  return {
    user,
    isSessionLoading,
    room,
    gameState,
    currentQuestion,
    remainingMs,
    selectedAnswer,
    hasAnsweredCurrentQuestion,
    pageError,
    isLoadingPage,
    roomClosedReason,
    playerNames,
    isRulesOpen,
    setRulesOpen,
    roomGameConfig,
    wordleState,
    sharedWord,
    store,
    isUserInRoom,
    handleSelectAnswer,
    handleSubmitAnswer,
    handleSetReady,
    formatGameType: () => formatGamesPageGameType(room),
    getWordleMissingPlayers: () =>
      room?.players
        .filter((player) => !player.isReady)
        .map(
          (player) => playerNames[player.userId] ?? `Joueur #${player.userId}`,
        ) ?? [],
    getWinnerName: (winnerUserId: number) =>
      playerNames[winnerUserId] ?? `Joueur #${winnerUserId}`,
  };
}
