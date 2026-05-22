import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuizGameSection from "../components/room/QuizGameSection";
import Section from "../components/section";
import SectionHeader from "../components/section-header";
import SectionLabel from "../components/section-label";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useToast } from "../components/ui/toast";
import { toHHMMSS } from "../components/Wordle/ConvertTime";
import Guess from "../components/Wordle/Guess";
import Keyboard from "../components/Wordle/Keyboard";
import ProgressBar from "../components/Wordle/ProgressBar";
import PuzzleStore from "../components/Wordle/PuzzleStore";
import RulesPanel from "../components/Wordle/RulesPanel";
import { useAuthSession } from "../hooks/useAuthSession";
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

export default observer(GamesPage);

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

function GamesPage() {
  const { roomId: roomIdParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthSession();

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
  const [isRulesOpen, setRulesOpen] = useState(true);
  const [isPlayerReady, setPlayerReady] = useState(false);
  const hasFinishedWordleRef = useRef(false);

  const store = useLocalObservable(() => PuzzleStore);
  const toast = useToast();
  const isRulesOpenRef = useRef(isRulesOpen); // because useEffect keeps the very first value otherwise

  useEffect(() => {
    isRulesOpenRef.current = isRulesOpen;
  }, [isRulesOpen]);

  useEffect(() => {
    store.init();
    const handleKeyup = (e: KeyboardEvent) => store.handleKeyup(e);
    window.addEventListener("keyup", handleKeyup);

    // The interval is created here, so only once:
    const intervalId = setInterval(() => {
      // if all players are ready
      if (isRulesOpenRef.current === false) store.checkTimeUp();
      if (store.currentGuess === store.maxAttempts || store.won) {
        clearInterval(intervalId);
      }
    }, 1000); // update every 1s for progress

    return () => {
      window.removeEventListener("keyup", handleKeyup);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (room?.gameType !== "wordle" || !room?.id) {
      return;
    }

    if (!store.won && !store.lost) {
      return;
    }

    if (hasFinishedWordleRef.current) {
      return;
    }

    hasFinishedWordleRef.current = true;

    const finalizeWordle = async () => {
      try {
        await connectWs();
        emitWs("game:finish", { roomId: room.id });
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
  }, [navigate, room?.gameType, room?.id, store.timeStatus, store.won]);

  useEffect(() => {
    if (store.ToastId === 0) return;

    if (store.ToastMessage === "Ce mot n'est pas dans la liste")
      toast.error(store.ToastMessage);
    else if (
      store.ToastMessage ===
      `Pour valider un mot, vous devez entrer ${roomGameConfig?.wordLength} lettres`
    )
      toast.error(store.ToastMessage);
    else if (
      store.ToastMessage ===
      `Vous avez trouvé le bon mot en ${toHHMMSS((Math.floor(Date.now() / 1000) - store.total_time).toString())}`
    )
      //TEMPORAIRE
      toast.success(store.ToastMessage);
    else if (
      store.ToastMessage ===
      `Le temps est écoulé, vous n'avez pas trouvé le mot: ${store.word}`
    )
      toast.error(store.ToastMessage);
    else if (
      store.ToastMessage === `Vous n'avez pas trouvé le mot: ${store.word}`
    )
      toast.error(store.ToastMessage);
  }, [store.ToastId]);

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
  }, [navigate, roomId, user?.id]);

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

      if (
        data.reason === "wordle_completed" &&
        user?.id === data.winnerUserId
      ) {
        navigate(`/rooms/${roomId}`, { replace: true });
      }
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
  }, [navigate, roomId, user?.id]);

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

    return config as Record<string, number>;
  }, [room?.gameConfig]);

  const gameTypeLabel = useMemo(() => formatGameType(room), [room]);
  const roomConfigEntries = useMemo(
    () => Object.entries(roomGameConfig ?? {}),
    [roomGameConfig],
  );

  useEffect(() => {
    // Sync store configuration with room settings for Wordle
    if (room?.gameType === "wordle") {
      const configuredLength = roomGameConfig?.wordLength ?? store.nbr_letters;
      const configuredMaxAttempts =
        roomGameConfig?.maxAttempts ?? store.maxAttempts;
      let shouldInit = false;
      if (configuredLength !== store.nbr_letters) {
        store.nbr_letters = configuredLength;
        shouldInit = true;
      }
      if (configuredMaxAttempts !== store.maxAttempts) {
        store.maxAttempts = configuredMaxAttempts;
        shouldInit = true;
      }
      if (shouldInit) {
        // Re-init to pick proper word list and reset guesses
        store.init();
        store.start_time = Math.floor(Date.now() / 1000);
      }
    }
  }, [room?.gameType, roomGameConfig?.wordLength, roomGameConfig?.maxAttempts]);

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
          <div className="mt-5">
            <Link to="/">
              <PrimaryButton>Retour à l'accueil</PrimaryButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (gameState?.status === "finished") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
        <Section className="overflow-hidden border-white/12 bg-surface/95 p-0">
          <div className="border-b border-white/10 px-6 py-5 md:px-8">
            <SectionLabel className="text-slate-400">
              Partie terminée
            </SectionLabel>
            <SectionHeader className="text-3xl">
              {gameState.winnerUserId
                ? `Le gagnant est ${playerNamesById[gameState.winnerUserId] ?? `Joueur #${gameState.winnerUserId}`}`
                : "La partie est terminée"}
            </SectionHeader>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
              Voici le classement final. Tu peux revenir à la room pour relancer
              une nouvelle partie ou repartir à l'accueil.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 md:px-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Résultat
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg/70 px-4 py-3">
                  <span className="text-sm text-white/65">Joueurs classés</span>
                  <span className="text-lg font-semibold text-white">
                    {gameState.leaderboard.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg/70 px-4 py-3">
                  <span className="text-sm text-white/65">Statut</span>
                  <span className="text-sm font-semibold text-emerald-300">
                    Terminé
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg/70 px-4 py-3">
                  <span className="text-sm text-white/65">Mode</span>
                  <span className="text-sm font-semibold text-white">
                    {room?.gameType === "wordle"
                      ? "Wordle"
                      : formatGameType(room)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Classement
                </p>
                <span className="rounded-full border border-white/10 bg-bg/80 px-3 py-1 text-xs font-semibold text-white/70">
                  {gameState.leaderboard.length} joueur
                  {gameState.leaderboard.length !== 1 ? "s" : ""}
                </span>
              </div>

              <ol className="mt-4 space-y-3">
                {gameState.leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const rankTone =
                    isCurrentUser && index !== 0
                      ? "border-amber-300/50 bg-amber-400/10"
                      : "border-slate-200/15 bg-white/6";

                  return (
                    <li
                      key={entry.userId}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${rankTone}`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-bg/80 text-sm font-semibold text-white">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {playerNamesById[entry.userId] ??
                            `Joueur #${entry.userId}`}
                        </p>
                        <p className="text-xs text-white/55">
                          {index === 0 ? "Premier" : `Position ${index + 1}`}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-bg/70 px-3 py-1 text-sm font-semibold text-white/80">
                        {entry.score} point{entry.score !== 1 ? "s" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-white/10 px-6 py-5 md:px-8">
            <Link to={room ? `/rooms/${room.id}` : "/"}>
              <PrimaryButton>Revenir à la room</PrimaryButton>
            </Link>
            <Link to="/">
              <SecondaryButton>Retour à l'accueil</SecondaryButton>
            </Link>
          </div>
        </Section>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="mx-auto flex flex-col w-full max-w-7xl flex-1 px-6 py-8 md:px-10 md:py-12 justify-center">
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
        isRulesOpen ? (
          <div className="flex items-center justify-center">
            <RulesPanel
              onClose={() => setRulesOpen(false)}
              store={store}
              setReady={() => {
                setPlayerReady(true);
              }}
              readyFlag={isPlayerReady}
            />
          </div>
        ) : (
          <section className="flex flex-1 flex-col py-1 items-center justify-center">
            {store.word}
            <ProgressBar start_time={store.start_time} store={store} />

            <div>
              {store.guesses.map((_, i) => (
                <Guess
                  key={i}
                  checkerValidWord={store.all_words_array_json}
                  lettersCount={roomGameConfig?.wordLength ?? 5}
                  flag={store.validWord}
                  word={store.word}
                  guess={store.guesses[i] ?? ""}
                  isGuessed={i < store.currentGuess}
                />
              ))}
            </div>

            <div className="mt-3">
              <Keyboard store={store} />
            </div>
          </section>
        )
      ) : (
        <section className="flex flex-1 flex-col rounded-4xl border border-white/10 bg-surface p-6 text-text shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <SectionLabel className="text-slate-400">Jeux</SectionLabel>
          <SectionHeader>{room.gameType}</SectionHeader>
        </section>
      )}
    </main>
  );
}
