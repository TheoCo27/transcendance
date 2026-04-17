import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { getQuizzes, type Quiz } from "../services/quizzes";
import { getRoomsByQuizId } from "../services/rooms";

type QuizWithRoomCount = Quiz & {
  activeRoomCount: number;
};

function formatDurationLabel(questionDurationSec: number | null) {
  if (questionDurationSec === null) {
    return "Illimite";
  }
  return `${questionDurationSec} sec`;
}

export default function JoinQuizRoomPage() {
  const [quizzes, setQuizzes] = useState<QuizWithRoomCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedQuizzes = await getQuizzes();
        const quizzesWithRooms = await Promise.all(
          fetchedQuizzes.map(async (quiz) => {
            const rooms = await getRoomsByQuizId(quiz.id);
            const activeRoomCount = rooms.filter(
              (room) => room.status !== "finished",
            ).length;

            return {
              ...quiz,
              activeRoomCount,
            };
          }),
        );

        setQuizzes(quizzesWithRooms);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les quiz.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
      <section className="rounded-[2.5rem] border border-slate-900/10 bg-white/70 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.08)] backdrop-blur">
        <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
          Rejoindre une quizz room
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold text-slate-950 md:text-5xl">
          Choisis un quiz publie, ouvre son hub et entre dans la room de jeu.
        </h1>
        <p className="mt-4 max-w-3xl text-base text-slate-600">
          Chaque quiz regroupe ses rooms ouvertes. Depuis la page quiz, tu peux
          creer une room partageable ou ouvrir directement son URL dediee.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-[2rem] border border-slate-900/10 bg-white/70 p-6 text-slate-600">
            Chargement des quiz...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && quizzes.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-900/15 bg-white/50 p-8 text-slate-600">
            Aucun quiz n'a encore ete publie. Cree le premier depuis l'admin.
          </div>
        ) : null}

        {!isLoading && !error
          ? quizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="flex h-full flex-col rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Quiz #{quiz.id}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      {quiz.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {quiz.questions.length} Q
                  </span>
                </div>

                <dl className="mt-6 grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3">
                    <dt>Temps</dt>
                    <dd className="font-semibold text-slate-950">
                      {formatDurationLabel(quiz.questionDurationSec)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3">
                    <dt>Rooms actives</dt>
                    <dd className="font-semibold text-slate-950">
                      {quiz.activeRoomCount}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link className="w-full" to={`/quiz/${quiz.id}`}>
                    <PrimaryButton className="w-full justify-center">
                      Ouvrir le hub du quiz
                    </PrimaryButton>
                  </Link>
                  <Link className="w-full sm:w-auto" to="/admin">
                    <SecondaryButton className="w-full justify-center">
                      Creer un autre quiz
                    </SecondaryButton>
                  </Link>
                </div>
              </article>
            ))
          : null}
      </section>
    </main>
  );
}
