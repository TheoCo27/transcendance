import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import QuestionComposer from "../components/QuizBuilder/QuestionComposer";
import QuizRulesCard from "../components/QuizBuilder/QuizRulesCard";
import QuizSetupCard from "../components/QuizBuilder/QuizSetupCard";
import SectionHeader from "../components/section-header";
import SectionLabel from "../components/section-label";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import { createQuiz } from "../services/quizzes";

type DraftQuestion = {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
};

const EMPTY_DRAFT: DraftQuestion = {
  questionText: "",
  options: ["", "", "", ""],
  correctAnswerIndex: 0,
};

export default function QuizAdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuthSession();
  const [title, setTitle] = useState("");
  const [rule, setRule] = useState<10 | 30 | "unlimited">(10);
  const [draftQuestion, setDraftQuestion] =
    useState<DraftQuestion>(EMPTY_DRAFT);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const roomIdParam = Number(searchParams.get("roomId"));
  const returnRoomId =
    Number.isInteger(roomIdParam) && roomIdParam > 0 ? roomIdParam : null;

  const validateDraftQuestion = () => {
    if (draftQuestion.questionText.trim().length < 6) {
      return "La question doit contenir au moins 6 caractères.";
    }

    if (draftQuestion.options.some((option) => option.trim().length < 1)) {
      return "Les 4 options de réponse sont obligatoires.";
    }

    // Check for duplicate options
    const normalizedOptions = draftQuestion.options.map((option) =>
      option.trim().toLowerCase(),
    );
    const uniqueOptions = new Set(normalizedOptions);
    if (uniqueOptions.size < 4) {
      return "Les options de réponse doivent être uniques.";
    }

    return null;
  };

  const saveDraftQuestion = (resetAfterSave: boolean) => {
    const error = validateDraftQuestion();
    if (error) {
      setQuestionError(error);
      return false;
    }

    const normalizedQuestion: DraftQuestion = {
      questionText: draftQuestion.questionText.trim(),
      options: draftQuestion.options.map((option) => option.trim()),
      correctAnswerIndex: draftQuestion.correctAnswerIndex,
    };

    setQuestions((currentQuestions) => [
      ...currentQuestions,
      normalizedQuestion,
    ]);
    setQuestionError(null);

    if (resetAfterSave) {
      setDraftQuestion(EMPTY_DRAFT);
    }

    return true;
  };

  const handleValidateQuestion = () => {
    void saveDraftQuestion(false);
  };

  const handleValidateAndAddQuestion = () => {
    void saveDraftQuestion(true);
  };

  const handleSubmitQuiz = async () => {
    setSubmitError(null);

    if (!user) {
      navigate("/login");
      return;
    }

    if (title.trim().length < 2) {
      setSubmitError("Le nom du quiz doit contenir au moins 2 caractères.");
      return;
    }

    if (questions.length === 0) {
      setSubmitError("Ajoute au moins une question avant de valider le quiz.");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdQuiz = await createQuiz({
        title: title.trim(),
        questionDurationSec: rule === "unlimited" ? null : rule,
        questions: questions.map((question) => ({
          questionText: question.questionText,
          answers: question.options,
          correctAnswerIndex: question.correctAnswerIndex,
        })),
      });

      if (returnRoomId !== null) {
        navigate(`/rooms/${returnRoomId}?selectQuizId=${createdQuiz.id}`);
        return;
      }

      navigate("/");
    } catch (error) {
      setSubmitError(
        getUserFacingErrorMessage(error, "Impossible de creer le quiz."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
      {returnRoomId !== null ? (
        <section className="mb-6 rounded-4xl border border-emerald-300/35 bg-emerald-300/10 p-5 text-emerald-50 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100/80">
            Création depuis une room
          </p>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">
            Une fois validé, ce quiz sera renvoyé dans les réglages de ta room
            et présélectionné automatiquement.
          </p>
          <Link
            className="mt-4 inline-flex rounded-md border border-emerald-100/20 bg-emerald-950/25 px-4 py-2 font-semibold text-emerald-50 transition hover:bg-emerald-950/40"
            to={`/rooms/${returnRoomId}`}
          >
            Retour à la room
          </Link>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <QuizSetupCard title={title} onTitleChange={setTitle} />
        <QuizRulesCard value={rule} onChange={setRule} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <QuestionComposer
          questionText={draftQuestion.questionText}
          options={draftQuestion.options}
          correctAnswerIndex={draftQuestion.correctAnswerIndex}
          error={questionError}
          onQuestionTextChange={(value) =>
            setDraftQuestion((currentDraft) => ({
              ...currentDraft,
              questionText: value,
            }))
          }
          onOptionChange={(index, value) =>
            setDraftQuestion((currentDraft) => ({
              ...currentDraft,
              options: currentDraft.options.map((option, optionIndex) =>
                optionIndex === index ? value : option,
              ),
            }))
          }
          onCorrectAnswerChange={(index) =>
            setDraftQuestion((currentDraft) => ({
              ...currentDraft,
              correctAnswerIndex: index,
            }))
          }
          onValidateQuestion={handleValidateQuestion}
          onValidateAndAddQuestion={handleValidateAndAddQuestion}
        />

        <section
          className={`rounded-4xl border border-slate-900/10 ${questions.length > 1 ? "" : "h-fit"} bg-slate-950 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] flex flex-col overflow-hidden`}
        >
          <SectionLabel className="text-text/55">Quiz construit</SectionLabel>
          <SectionHeader>Questions validées</SectionHeader>
          <p className="mt-2 text-sm text-white/70">
            {questions.length} question{questions.length > 1 ? "s" : ""} prête
            {questions.length > 1 ? "s" : ""} à jouer.
          </p>

          <div className="mt-6 space-y-4 overflow-y-auto max-h-[min(45vh,40rem)]">
            {questions.length > 0 ? (
              questions.map((question, index) => (
                <article
                  key={`${question.questionText}-${index + 1}`}
                  className="rounded-3xl border border-white/10 bg-white/6 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                      Question {index + 1}
                    </span>
                    <SecondaryButton
                      onClick={() =>
                        setQuestions((currentQuestions) =>
                          currentQuestions.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    >
                      Supprimer
                    </SecondaryButton>
                  </div>
                  <p className="mt-3 text-base font-medium text-white">
                    {question.questionText}
                  </p>
                  <ol className="mt-4 space-y-2 text-sm text-white/74">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={`${option}-${optionIndex + 1}`}
                        className={[
                          "rounded-xl px-3 py-2",
                          question.correctAnswerIndex === optionIndex
                            ? "bg-emerald-400/18 text-emerald-100"
                            : "bg-white/6",
                        ].join(" ")}
                      >
                        {option}
                      </li>
                    ))}
                  </ol>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/18 px-4 py-6 text-sm text-white/62">
                Aucune question validée pour l'instant.
              </div>
            )}
          </div>

          {submitError ? (
            <p className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {submitError}
            </p>
          ) : null}

          <PrimaryButton
            className="mt-6 w-full justify-center"
            disabled={isLoading || isSubmitting || questions.length < 1}
            onClick={() => {
              void handleSubmitQuiz();
            }}
          >
            {isSubmitting ? "Validation..." : "Valider le quiz"}
          </PrimaryButton>
        </section>
      </div>
    </main>
  );
}
