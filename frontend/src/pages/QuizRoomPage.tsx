import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getQuizById, type Quiz } from "../services/quizzes";
import { getRoomsByQuizId, type Room } from "../services/rooms";
import { getQuizLeaderboard, type QuizLeaderboardEntry } from "../services/scores";
import {
  connectWs,
  disconnectWs,
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";

type RoomListPayload = Room[];

function formatDurationLabel(questionDurationSec: number | null) {
  if (questionDurationSec === null) {
    return "Illimite";
  }

  return `${questionDurationSec} sec`;
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

export default function QuizRoomPage() {
  const { quizId: quizIdParam } = useParams();
  const quizId = Number(quizIdParam);
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState<QuizLeaderboardEntry[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const refreshRooms = async () => {
    if (!Number.isFinite(quizId) || quizId <= 0) {
      return;
    }

    const fetchedRooms = await getRoomsByQuizId(quizId);
    setRooms(fetchedRooms);
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
      const [fetchedQuiz, fetchedRooms, fetchedLeaderboard] = await Promise.all([
        getQuizById(quizId),
        getRoomsByQuizId(quizId),
        getQuizLeaderboard(quizId, 10),
      ]);

      setQuiz(fetchedQuiz);
      setRooms(fetchedRooms);
      setQuizLeaderboard(fetchedLeaderboard);
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
    if (!user || !Number.isFinite(quizId) || quizId <= 0) {
      return;
    }

    const handleRoomCreated = (response: WsResponse<Room>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.quizId !== quizId ||
        response.data.ownerUserId !== user.id
      ) {
        return;
      }

      setRoomActionError(null);
      navigate(`/rooms/${response.data.id}`);
    };

    const handleRoomListUpdated = (response: WsResponse<RoomListPayload>) => {
      if (!response.success || !response.data) {
        return;
      }

      setRooms(response.data.filter((room) => room.quizId === quizId));
    };

    const handleRoomError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setRoomActionError(response.error?.message ?? "Action room impossible.");
    };

    onWs("room:created", handleRoomCreated);
    onWs("room:list-updated", handleRoomListUpdated);
    onWs("room:create:error", handleRoomError);

    return () => {
      offWs("room:created", handleRoomCreated);
      offWs("room:list-updated", handleRoomListUpdated);
      offWs("room:create:error", handleRoomError);
    };
  }, [navigate, quizId, user]);

  const createRoom = async () => {
    if (!quiz || !user) {
      return;
    }

    try {
      setRoomActionError(null);
      await connectWs();
      emitWs("room:create", {
        name: quiz.title.slice(0, 40),
        rounds: quiz.questions.length,
        quizId: quiz.id,
        questionDurationSec: quiz.questionDurationSec,
        isPrivate: false,
        userId: user.id,
      });
    } catch (error) {
      setRoomActionError(
        error instanceof Error
          ? error.message
          : "Connexion temps reel impossible pour creer la room.",
      );
    }
  };

  const waitingRooms = rooms.filter((room) => room.status === "waiting");
  const liveRooms = rooms.filter((room) => room.status === "playing");

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
          <section className="grid gap-8 rounded-[2.75rem] border border-slate-900/10 bg-white/78 px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                /quiz/{quiz.id}
              </span>
              <h1 className="mt-6 text-4xl font-semibold text-slate-950 md:text-5xl">
                {quiz.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                Cette page centralise toutes les rooms de ce quiz. Cree une nouvelle
                session ou ouvre une room existante pour partager son URL directe.
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
                    Creer une room partageable
                  </PrimaryButton>
                ) : (
                  <Link to="/login">
                    <PrimaryButton className="justify-center">
                      Se connecter pour creer une room
                    </PrimaryButton>
                  </Link>
                )}
                <SecondaryButton className="justify-center" onClick={() => void refreshRooms()}>
                  Rafraichir les rooms
                </SecondaryButton>
              </div>

              {roomActionError ? (
                <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {roomActionError}
                </p>
              ) : null}
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
                Connecte-toi pour creer une room, partager son URL et rejoindre la
                partie en direct.
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

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Rooms disponibles
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                    Ouvrir une room
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
                      className="rounded-[1.5rem] border border-slate-900/10 bg-slate-50/85 p-5"
                    >
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Room #{room.id}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {room.players.length} joueur{room.players.length > 1 ? "s" : ""} ·{" "}
                            {formatRoomStatus(room.status)}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            URL partageable: /rooms/{room.id}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Link to={`/rooms/${room.id}`}>
                            <PrimaryButton className="justify-center">
                              Ouvrir la room
                            </PrimaryButton>
                          </Link>
                          <SecondaryButton
                            className="justify-center"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                `${window.location.origin}/rooms/${room.id}`,
                              );
                            }}
                          >
                            Copier l'URL
                          </SecondaryButton>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-900/12 px-4 py-6 text-sm text-slate-600">
                    Aucune room ouverte pour ce quiz. Cree la premiere.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Leaderboard all time
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Meilleurs joueurs du quiz
              </h2>
              <div className="mt-6 space-y-3">
                {quizLeaderboard.length > 0 ? (
                  quizLeaderboard.map((entry, index) => (
                    <div
                      key={`quiz-score-${entry.userId}`}
                      className="rounded-[1.25rem] bg-slate-100/85 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            #{index + 1} {entry.username}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {entry.gamesPlayed} parties / {entry.wins} victoires
                          </p>
                        </div>
                        <span className="text-lg font-semibold text-slate-950">
                          {entry.score}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] bg-slate-100/85 px-4 py-4 text-sm text-slate-600">
                    Aucune statistique all time pour ce quiz.
                  </div>
                )}
              </div>
            </section>
          </section>
        </>
      ) : null}
    </main>
  );
}
