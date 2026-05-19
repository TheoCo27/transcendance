import { PenLine, PlusCircle } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Link } from "react-router-dom";
import type { Quiz } from "../../services/quizzes";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import type { RoomConfigForm } from "./room-types";

type RoomConfigSectionProps = {
  roomId: string | undefined;
  form: RoomConfigForm;
  setForm: Dispatch<SetStateAction<RoomConfigForm>>;
  availableQuizzes: Quiz[];
  isLoadingQuizzes: boolean;
  isQuizSelectionSaved: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
};

export default function RoomConfigSection({
  roomId,
  form,
  setForm,
  availableQuizzes,
  isLoadingQuizzes,
  isQuizSelectionSaved,
  isSaving,
  onSave,
}: RoomConfigSectionProps) {
  const [isEditingSavedQuiz, setIsEditingSavedQuiz] = useState(false);

  useEffect(() => {
    if (form.gameType !== "quiz") {
      setIsEditingSavedQuiz(false);
      return;
    }

    if (isQuizSelectionSaved) {
      setIsEditingSavedQuiz(false);
    }
  }, [form.gameType, isQuizSelectionSaved]);

  const selectedQuiz = useMemo(
    () => availableQuizzes.find((quiz) => quiz.id === form.quizId) ?? null,
    [availableQuizzes, form.quizId],
  );

  const shouldShowQuizPicker =
    form.gameType === "quiz" && (!isQuizSelectionSaved || isEditingSavedQuiz);

  const selectedQuizTotalPoints = useMemo(() => {
    if (!selectedQuiz) {
      return 0;
    }

    return selectedQuiz.questions.reduce(
      (total, question) => total + question.points,
      0,
    );
  }, [selectedQuiz]);

  const selectedQuizCreatedAtLabel = useMemo(() => {
    if (!selectedQuiz) {
      return "Date inconnue";
    }

    const parsed = new Date(selectedQuiz.createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return "Date inconnue";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }, [selectedQuiz]);

  const selectedQuizDurationLabel =
    selectedQuiz?.questionDurationSec === null
      ? "Sans timer"
      : `${selectedQuiz?.questionDurationSec ?? 0} sec/question`;

  return (
    <section className="mt-8 rounded-4xl border border-white/10 bg-surface text-text p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SectionLabel className="text-slate-400">Configuration</SectionLabel>
      <SectionHeader>Réglages de la room</SectionHeader>

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
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Choix du quiz</span>
              <Link to={`/admin?from=${roomId}`}>
                <SecondaryButton className="inline-flex items-center gap-2 text-xs px-0 py-0 font-semibold">
                  <PlusCircle className="size-4" />
                  Ajouter un quiz
                </SecondaryButton>
              </Link>
            </div>

            {!shouldShowQuizPicker ? (
              <div className="mt-3 rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-100/90">
                    Quiz selectionné
                  </p>
                  <SecondaryButton
                    className="inline-flex items-center gap-2"
                    type="button"
                    onClick={() => {
                      setIsEditingSavedQuiz(true);
                    }}
                  >
                    <PenLine className="size-3" />
                    <span className="text-sm">Changer</span>
                  </SecondaryButton>
                </div>

                <p className="mt-2 line-clamp-2 text-xl font-bold leading-6 text-emerald-50">
                  {selectedQuiz?.title ?? `Quiz #${form.quizId}`}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg border border-emerald-100/20 bg-emerald-950/25 px-2.5 py-2">
                    <p className="text-emerald-100/70">
                      Question
                      {selectedQuiz?.questions.length &&
                      selectedQuiz?.questions.length > 1
                        ? "s"
                        : ""}
                    </p>
                    <p className="mt-1 font-semibold text-emerald-50">
                      {selectedQuiz?.questions.length ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-100/20 bg-emerald-950/25 px-2.5 py-2">
                    <p className="text-emerald-100/70">Timer</p>
                    <p className="mt-1 font-semibold text-emerald-50">
                      {selectedQuizDurationLabel}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-100/20 bg-emerald-950/25 px-2.5 py-2">
                    <p className="text-emerald-100/70">Points max</p>
                    <p className="mt-1 font-semibold text-emerald-50">
                      {selectedQuizTotalPoints}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-100/20 bg-emerald-950/25 px-2.5 py-2">
                    <p className="text-emerald-100/70">Crée le</p>
                    <p className="mt-1 font-semibold text-emerald-50">
                      {selectedQuizCreatedAtLabel}
                    </p>
                  </div>
                </div>
              </div>
            ) : isLoadingQuizzes ? (
              <p className="mt-3 rounded-xl border border-white/10 bg-bg px-4 py-3 text-sm text-slate-300">
                Chargement des quiz...
              </p>
            ) : availableQuizzes.length === 0 ? (
              <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Aucun quiz disponible pour l'instant...
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
                          quizId: previous.quizId === quiz.id ? null : quiz.id,
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
              <span className="text-sm font-medium">Longueur du mot (4-8)</span>
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
              <span className="text-sm font-medium ">Essais max (3-10)</span>
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
            <span className="text-sm font-medium">Nombre de paires (2-20)</span>
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
          onClick={async () => {
            try {
              await onSave();
            } catch {
              // error already surfaced by caller; swallow to avoid unhandled rejection
            }

            if (isEditingSavedQuiz) setIsEditingSavedQuiz(false);
          }}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </PrimaryButton>
      </div>
    </section>
  );
}
