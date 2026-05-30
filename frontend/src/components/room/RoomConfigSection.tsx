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
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import RoomSectionHeader from "./room-section-header";
import RoomSectionLabel from "./room-section-label";
import type { RoomConfigForm } from "./room-types";

type RoomConfigSectionProps = {
  roomId: number;
  form: RoomConfigForm;
  setForm: Dispatch<SetStateAction<RoomConfigForm>>;
  availableQuizzes: Quiz[];
  isLoadingQuizzes: boolean;
  isQuizSelectionSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
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

  const createQuizPath = `/admin?roomId=${roomId}`;

  return (
    <section className="mt-8 rounded-4xl border border-white/10 bg-surface text-text p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <RoomSectionLabel className="text-slate-400">
        Configuration
      </RoomSectionLabel>
      <RoomSectionHeader>Réglages de la room</RoomSectionHeader>

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
          <div className="flex min-h-12 items-center rounded-xl border border-white/10 bg-bg px-4 py-3 text-sm font-medium text-text-muted">
            Quiz
          </div>
        </label>

        {form.gameType === "quiz" ? (
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Choix du quiz</p>
                <p className="mt-1 text-sm text-slate-400">
                  Sélectionne un quiz existant ou crée le tien pour cette room.
                </p>
              </div>

              <Link
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-bg px-4 py-2 text-text-muted transition hover:border-primary hover:bg-white/5 hover:text-white"
                to={createQuizPath}
              >
                <PlusCircle className="size-4" />
                <span>Créer son quiz</span>
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
              <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                <p>
                  Aucun quiz disponible pour l'instant. Crée un quiz avant de le
                  sélectionner ici.
                </p>
                <Link
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-200/40 bg-amber-200/10 px-4 py-2 font-semibold text-amber-50 transition hover:bg-amber-200/20"
                  to={createQuizPath}
                >
                  <PlusCircle className="size-4" />
                  <span>Créer mon premier quiz</span>
                </Link>
              </div>
            ) : (
              <>
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
                            quizId:
                              previous.quizId === quiz.id ? null : quiz.id,
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

                <p className="mt-3 text-xs text-slate-400">
                  Les 3 quiz par défaut et tous les quiz que tu crées
                  apparaissent ici.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <PrimaryButton
          className="px-5 py-2.5 text-sm"
          disabled={isSaving}
          onClick={() => {
            onSave();
            if (isEditingSavedQuiz) setIsEditingSavedQuiz(false);
          }}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </PrimaryButton>
      </div>
    </section>
  );
}
