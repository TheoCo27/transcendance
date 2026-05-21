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
  createdAt: string;
  questionDurationSec: number | null;
  questions: QuizQuestion[];
};

export type CreateQuizPayload = {
  title: string;
  questionDurationSec?: 10 | 30 | null;
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

export function getQuizById(id: number): Promise<Quiz> {
  return apiRequest<Quiz>(`/quizzes/${id}`);
}

export function createQuiz(payload: CreateQuizPayload): Promise<Quiz> {
  return apiRequest<Quiz>("/quizzes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
