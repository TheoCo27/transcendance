import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getQuizzes, type Quiz } from "../services/quizzes";

function formatRuleLabel(questionDurationSec: number | null) {
  if (questionDurationSec === null) {
    return "Illimite";
  }
  return `${questionDurationSec} sec`;
}

export default function HomePage() {
  const { user } = useAuthSession();
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    const loadRecentQuizzes = async () => {
      try {
        const quizzes = await getQuizzes();
        setRecentQuizzes(quizzes.slice(0, 3));
      } catch {
        setRecentQuizzes([]);
      }
    };

    void loadRecentQuizzes();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      <section className="grid gap-8 rounded-[2.75rem] border border-slate-900/10 bg-white/76 px-6 py-8 shadow-[0_40px_110px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-12 lg:grid-cols-[1.25fr_0.95fr]">
        <div>
          <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-amber-900">
            Quiz room builder
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-slate-950 md:text-6xl">
            Cree un quiz, ouvre sa room et lance enfin une vraie partie jouable.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            La home sert maintenant de rampe de lancement: creation de quiz,
            acces direct aux rooms et page de jeu dediee a chaque quiz.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link to={user ? "/admin" : "/register"}>
              <PrimaryButton className="w-full justify-center sm:w-auto">
                Creer un quizz
              </PrimaryButton>
            </Link>
            <Link to="/join">
              <SecondaryButton className="w-full justify-center sm:w-auto">
                Rejoindre une quizz room
              </SecondaryButton>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-4 py-2">
              URL de jeu dediee par quiz
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2">
              Lobby temps reel
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2">
              Questions custom + timer
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              Flux 01
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              Creation admin guidee
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/72">
              Un setup clair pour le nom, un composeur de questions en 4 reponses
              et une regle de temps par question.
            </p>
          </article>

          <article className="rounded-[2rem] bg-amber-100 p-6 text-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-900/70">
              Flux 02
            </p>
            <h2 className="mt-4 text-2xl font-semibold">Page jouable instantanee</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Une fois publie, le quiz vit sur sa propre URL `/quiz/id`, avec room,
              joueurs, lancement et score final.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {recentQuizzes.length > 0 ? (
          recentQuizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="rounded-[2rem] border border-slate-900/10 bg-white/78 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Quiz recent
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                {quiz.title}
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} /{" "}
                {formatRuleLabel(quiz.questionDurationSec)}
              </p>
              <Link className="mt-6 inline-flex" to={`/quiz/${quiz.id}`}>
                <SecondaryButton>Ouvrir /quiz/{quiz.id}</SecondaryButton>
              </Link>
            </article>
          ))
        ) : (
          <article className="rounded-[2rem] border border-dashed border-slate-900/12 bg-white/60 p-6 text-slate-600 lg:col-span-3">
            Aucun quiz visible pour le moment. Utilise le CTA principal pour publier
            le premier.
          </article>
        )}
      </section>
    </main>
  );
}
