import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuestionComposer from "../components/QuizBuilder/QuestionComposer";
import QuizRulesCard from "../components/QuizBuilder/QuizRulesCard";
import QuizSetupCard from "../components/QuizBuilder/QuizSetupCard";
import SectionHeader from "../components/section-header";
import SectionLabel from "../components/section-label";
import EmptyCard from "../components/ui/empty-card";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { createQuiz } from "../services/quizzes";
import { joinRoom } from "../services/rooms";

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
  const [searchParams] = useSearchParams();
  const fromRoomId = searchParams.get("from");
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();
  const [title, setTitle] = useState("");
  const [rule, setRule] = useState<10 | 30 | "unlimited">(10);
  const [draftQuestion, setDraftQuestion] =
    useState<DraftQuestion>(EMPTY_DRAFT);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateDraftQuestion = () => {
    if (draftQuestion.questionText.trim().length < 6) {
      return "La question doit contenir au moins 6 caracteres.";
    }

    if (draftQuestion.options.some((option) => option.trim().length < 1)) {
      return "Les 4 options de reponse sont obligatoires.";
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
      setSubmitError("Le nom du quiz doit contenir au moins 2 caracteres.");
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

      if (fromRoomId && user) {
        try {
          await joinRoom(Number(fromRoomId), { userId: user.id });
        } catch (e) {}
        navigate(`/rooms/${fromRoomId}`);
      } else {
        navigate(`/quiz/${createdQuiz.id}`);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Impossible de créer le quiz.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <QuizSetupCard title={title} onTitleChange={setTitle} />
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
        </div>

        <div className="space-y-6">
          <QuizRulesCard value={rule} onChange={setRule} />

          <div className="rounded-4xl border border-slate-900/10 bg-slate-950 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
            <SectionLabel className="text-text/55">Quiz construit</SectionLabel>
            <SectionHeader>Questions validées</SectionHeader>
            {questions.length > 0 ? (
              <p className="mt-2 text-sm text-white/70">
                {questions.length} question{questions.length > 1 ? "s" : ""}{" "}
                prête
                {questions.length > 1 ? "s" : ""} à jouer.
              </p>
            ) : null}
            {/* <p className="mt-2 text-sm text-white/70">
              {questions.length} question{questions.length > 1 ? "s" : ""} prête
              {questions.length > 1 ? "s" : ""} à jouer.
            </p> */}

            <div className="mt-6 space-y-4">
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
                <EmptyCard>Aucune question validée pour l'instant.</EmptyCard>
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
              onClick={() => handleSubmitQuiz()}
            >
              {isSubmitting ? "Validation..." : "Valider le quiz"}
            </PrimaryButton>
          </div>
        </div>
      </section>
    </main>
  );
}
