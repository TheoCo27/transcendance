import { useCallback, useEffect, useState } from "react";
import {
  createQuiz,
  getQuizzes,
  type CreateQuizPayload,
  type Quiz,
} from "../services/quizzes";

export function useQuizLibrary() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  const loadQuizzes = useCallback(async () => {
    setQuizzesLoading(true);
    setQuizzesError(null);

    try {
      setQuizzes(await getQuizzes());
    } catch (error) {
      setQuizzesError(
        error instanceof Error ? error.message : "Impossible de charger les quiz",
      );
    } finally {
      setQuizzesLoading(false);
    }
  }, []);

  const createQuizAndRefresh = useCallback(
    async (payload: CreateQuizPayload) => {
      setIsCreatingQuiz(true);
      setQuizzesError(null);

      try {
        const quiz = await createQuiz(payload);
        setQuizzes((previous) => [quiz, ...previous]);
        return quiz;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de créer le quiz";
        setQuizzesError(message);
        throw error;
      } finally {
        setIsCreatingQuiz(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  return {
    quizzes,
    quizzesLoading,
    quizzesError,
    isCreatingQuiz,
    createQuizAndRefresh,
  };
}
