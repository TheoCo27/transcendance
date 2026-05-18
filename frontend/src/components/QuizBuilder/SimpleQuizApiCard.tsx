import { useMemo, useState } from "react";
import {
  fetchSimpleQuizQuestions,
  type SimpleQuizApiCategory,
  type SimpleQuizApiDifficulty,
} from "../../services/simpleQuizApi";
import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";

type SimpleQuizQuestionDraft = {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
};

type SimpleQuizApiCardProps = {
  onImportQuestions: (
    questions: SimpleQuizQuestionDraft[],
    suggestedTitle: string,
  ) => void;
  currentQuestionCount: number;
  disabled?: boolean;
};

const CATEGORIES: Array<{
  value: SimpleQuizApiCategory;
  label: string;
}> = [
  { value: "tv_cinema", label: "TV et cinéma" },
  { value: "culture_generale", label: "Culture générale" },
  { value: "musique", label: "Musique" },
  { value: "art_litterature", label: "Arts et littérature" },
  { value: "actu_politique", label: "Actualités et politique" },
  { value: "sport", label: "Sport" },
  { value: "jeux_videos", label: "Jeux vidéo" },
  { value: "histoire", label: "Histoire" },
  { value: "geographie", label: "Géographie" },
  { value: "science", label: "Science" },
  { value: "gastronomie", label: "Gastronomie" },
];

const DIFFICULTIES: Array<{
  value: SimpleQuizApiDifficulty;
  label: string;
}> = [
  { value: "facile", label: "Facile" },
  { value: "normal", label: "Normal" },
  { value: "difficile", label: "Difficile" },
];

function getCategoryLabel(category: SimpleQuizApiCategory) {
  return CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

function getDifficultyLabel(difficulty: SimpleQuizApiDifficulty) {
  return (
    DIFFICULTIES.find((item) => item.value === difficulty)?.label ?? difficulty
  );
}

function shuffleQuestionOptions(options: string[], correctAnswer: string) {
  const shuffledOptions = [...options];

  for (let index = shuffledOptions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledOptions[index], shuffledOptions[swapIndex]] = [
      shuffledOptions[swapIndex],
      shuffledOptions[index],
    ];
  }

  return {
    options: shuffledOptions,
    correctAnswerIndex: shuffledOptions.findIndex(
      (option) => option === correctAnswer,
    ),
  };
}

export default function SimpleQuizApiCard({
  onImportQuestions,
  currentQuestionCount,
  disabled = false,
}: SimpleQuizApiCardProps) {
  const [category, setCategory] = useState<SimpleQuizApiCategory>("tv_cinema");
  const [difficulty, setDifficulty] =
    useState<SimpleQuizApiDifficulty>("facile");
  const [limit, setLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImportedCount, setLastImportedCount] = useState<number | null>(
    null,
  );

  const selectedCategoryLabel = useMemo(
    () => getCategoryLabel(category),
    [category],
  );
  const selectedDifficultyLabel = useMemo(
    () => getDifficultyLabel(difficulty),
    [difficulty],
  );

  const handleImport = async () => {
    setError(null);

    if (limit < 1 || limit > 20) {
      setError("Le nombre de questions doit être compris entre 1 et 20.");
      return;
    }

    setIsLoading(true);
    try {
      const quizzes = await fetchSimpleQuizQuestions({
        category,
        difficulty,
        limit,
      });

      const importedQuestions = quizzes.map((item) => ({
        questionText: item.question,
        ...shuffleQuestionOptions(
          [item.answer, ...item.badAnswers],
          item.answer,
        ),
      }));

      setLastImportedCount(importedQuestions.length);
      onImportQuestions(
        importedQuestions,
        `Quiz ${selectedCategoryLabel} - ${selectedDifficultyLabel}`,
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Impossible d'importer le quiz.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section className="relative overflow-hidden border border-amber-200/20 bg-[linear-gradient(135deg,rgba(30,41,59,0.98),rgba(59,130,246,0.20),rgba(239,68,111,0.18))]">
      <div className="pointer-events-none absolute -right-20 -top-16 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-rose-300/20 blur-3xl" />

      <div className="relative z-10">
        <SectionLabel className="text-amber-100/80">
          Simple Quiz API
        </SectionLabel>
        <SectionHeader>Importer un quiz prêt à jouer</SectionHeader>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Choisis un thème et une difficulté, puis récupère des questions de
          l'API communautaire pour remplir ton quiz en une fois.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/75">
              Thème
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200 focus:ring-1 focus:ring-amber-200"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as SimpleQuizApiCategory)
              }
              disabled={isLoading || disabled}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/75">
              Difficulté
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200 focus:ring-1 focus:ring-amber-200"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as SimpleQuizApiDifficulty)
              }
              disabled={isLoading || disabled}
            >
              {DIFFICULTIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/75">
              Nombre de questions
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200 focus:ring-1 focus:ring-amber-200"
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              disabled={isLoading || disabled}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/70">
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1">
            {currentQuestionCount} question{currentQuestionCount > 1 ? "s" : ""}{" "}
            dans le quiz
          </span>
          <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-amber-100">
            {selectedCategoryLabel}
          </span>
          <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-amber-100">
            {selectedDifficultyLabel}
          </span>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : lastImportedCount ? (
          <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50">
            {lastImportedCount} question{lastImportedCount > 1 ? "s" : ""}{" "}
            importée
            {lastImportedCount > 1 ? "s" : ""} depuis l'API.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <SecondaryButton
            className="w-full sm:w-auto"
            disabled={isLoading || disabled}
            onClick={() => {
              setLimit(5);
              setCategory("tv_cinema");
              setDifficulty("facile");
              setError(null);
            }}
          >
            Réinitialiser
          </SecondaryButton>
          <PrimaryButton
            className="w-full justify-center sm:w-auto"
            disabled={isLoading || disabled}
            onClick={handleImport}
          >
            {isLoading ? "Import en cours..." : "Importer ces questions"}
          </PrimaryButton>
        </div>
      </div>
    </Section>
  );
}
