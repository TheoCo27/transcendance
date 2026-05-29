import { apiRequest } from "./api";

export type QuizQuestion = {
  id: number;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  position: number;
  points: number;
  createdAt: string;
};

export type Quiz = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  createdAt: string;
  questions: QuizQuestion[];
};

export type CreateQuizPayload = {
  title: string;
  questions: Array<{
    questionText: string;
    answers: string[];
    correctAnswerIndex: number;
    points?: number;
  }>;
};

export function getQuizzes(): Promise<Quiz[]> {
  return apiRequest<Quiz[]>("/quizzes");
}

export function getQuizById(quizId: number): Promise<Quiz> {
  return apiRequest<Quiz>(`/quizzes/${quizId}`);
}

export function createQuiz(payload: CreateQuizPayload): Promise<Quiz> {
  return apiRequest<Quiz>("/quizzes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
