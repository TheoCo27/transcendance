import { useState } from "react";
import Panel from "../Panel";
import PrimaryButton from "../PrimaryButton";
import {
  QUIZ_MAX_ANSWERS,
  QUIZ_MIN_ANSWERS,
  QUIZ_QUESTION_MIN_LENGTH,
  QUIZ_TITLE_MIN_LENGTH,
  type CreateQuizPayload,
  type CreateQuizQuestionPayload,
} from "../../services/quizzes";

type QuizCreatePanelProps = {
  isCreatingQuiz: boolean;
  actionsDisabled: boolean;
  onBack: () => void;
  onCreateQuiz: (payload: CreateQuizPayload) => Promise<unknown>;
  onRequireAuth: () => void;
};

const emptyAnswers = ["", "", "", ""];

export default function QuizCreatePanel({
  isCreatingQuiz,
  actionsDisabled,
  onBack,
  onCreateQuiz,
  onRequireAuth,
}: QuizCreatePanelProps) {
  const [title, setTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answers, setAnswers] = useState(emptyAnswers);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [questions, setQuestions] = useState<CreateQuizQuestionPayload[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const resetQuestionForm = () => {
    setQuestionText("");
    setAnswers(emptyAnswers);
    setCorrectAnswerIndex(0);
  };

  const handleAddQuestion = () => {
    setCreateError(null);

    const trimmedQuestion = questionText.trim();
    const indexedAnswers = answers
      .map((answer, index) => ({ answer: answer.trim(), index }))
      .filter((entry) => entry.answer.length > 0);
    const nextCorrectAnswerIndex = indexedAnswers.findIndex(
      (entry) => entry.index === correctAnswerIndex,
    );

    if (trimmedQuestion.length < QUIZ_QUESTION_MIN_LENGTH) {
      setCreateError("Écris une question avant de l'ajouter.");
      return;
    }

    if (indexedAnswers.length < QUIZ_MIN_ANSWERS) {
      setCreateError(`Ajoute au moins ${QUIZ_MIN_ANSWERS} réponses.`);
      return;
    }

    if (nextCorrectAnswerIndex < 0) {
      setCreateError("La bonne réponse doit être une réponse remplie.");
      return;
    }

    setQuestions((previous) => [
      ...previous,
      {
        questionText: trimmedQuestion,
        answers: indexedAnswers.map((entry) => entry.answer),
        correctAnswerIndex: nextCorrectAnswerIndex,
        points: 1,
      },
    ]);
    resetQuestionForm();
  };

  const handleCreateQuiz = async () => {
    setCreateError(null);

    if (actionsDisabled) {
      onRequireAuth();
      return;
    }

    if (title.trim().length < QUIZ_TITLE_MIN_LENGTH) {
      setCreateError(`Le titre doit contenir au moins ${QUIZ_TITLE_MIN_LENGTH} caractères.`);
      return;
    }

    if (questions.length < 1) {
      setCreateError("Ajoute au moins une question au quiz.");
      return;
    }

    try {
      await onCreateQuiz({
        title: title.trim(),
        questions,
      });
      setTitle("");
      setQuestions([]);
      resetQuestionForm();
      onBack();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Erreur de création du quiz.",
      );
    }
  };

  return (
    <Panel className="min-h-[80vh] w-full px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-semibold text-text">Créer un quiz</h1>
        </div>
        <button
          className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
          type="button"
          onClick={onBack}
        >
          Retour aux quiz
        </button>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] gap-6">
        <div className="space-y-5">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-text/70"
              htmlFor="quiz-title"
            >
              Titre du quiz
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
              id="quiz-title"
              type="text"
              placeholder="Culture générale"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-text/70"
              htmlFor="quiz-question"
            >
              Question
            </label>
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-white/10 bg-background px-4 py-4 leading-8 text-text outline-none placeholder:text-text/40"
              id="quiz-question"
              placeholder="Quelle est la capitale de la France ?"
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
            />
          </div>

          <div className="space-y-3">
            {answers.map((answer, index) => (
              <div className="flex items-center gap-3" key={index}>
                <input
                  aria-label={`Bonne réponse ${index + 1}`}
                  checked={correctAnswerIndex === index}
                  className="h-4 w-4 shrink-0 accent-primary"
                  name="correct-answer"
                  type="radio"
                  onChange={() => setCorrectAnswerIndex(index)}
                />
                <input
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
                  maxLength={200}
                  placeholder={`Réponse ${index + 1}${index >= QUIZ_MIN_ANSWERS ? " (optionnelle)" : ""}`}
                  type="text"
                  value={answer}
                  onChange={(event) => {
                    const nextAnswers = [...answers];
                    nextAnswers[index] = event.target.value;
                    setAnswers(nextAnswers.slice(0, QUIZ_MAX_ANSWERS));
                  }}
                />
              </div>
            ))}
          </div>

          {createError ? (
            <p className="m-0 text-sm text-red-300" role="alert">
              {createError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
              type="button"
              onClick={handleAddQuestion}
            >
              Ajouter la question
            </button>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/10 bg-background px-5 py-5">
          <div>
            <p className="m-0 text-lg font-semibold text-text">
              Questions ajoutées
            </p>
            <p className="m-0 mt-1 text-sm text-text/60">
              {questions.length} question{questions.length > 1 ? "s" : ""}
            </p>
            {questions.length > 0 ? (
              <ol className="mt-5 space-y-3 pl-5 text-sm text-text/70">
                {questions.map((question, index) => (
                  <li key={`${question.questionText}-${index}`}>
                    {question.questionText}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 text-sm text-text/60">
                Les questions ajoutées apparaîtront ici.
              </p>
            )}
          </div>
          <div className="mt-auto flex justify-center pt-6">
            <PrimaryButton
              className="px-5 py-2 text-sm"
              disabled={isCreatingQuiz || questions.length === 0}
              onClick={() => {
                void handleCreateQuiz();
              }}
            >
              {isCreatingQuiz ? "Création..." : "Créer le quiz"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}
