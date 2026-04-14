import { apiRequest } from "./api";

export const QUIZ_TITLE_MIN_LENGTH = 2;
export const QUIZ_QUESTION_MIN_LENGTH = 1;
export const QUIZ_MIN_ANSWERS = 2;
export const QUIZ_MAX_ANSWERS = 4;

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
  questions: QuizQuestion[];
};

export type CreateQuizQuestionPayload = {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  points?: number;
};

export type CreateQuizPayload = {
  title: string;
  questions: CreateQuizQuestionPayload[];
};

export function getQuizzes(): Promise<Quiz[]> {
  return apiRequest<Quiz[]>("/quizzes");
}

export function createQuiz(payload: CreateQuizPayload): Promise<Quiz> {
  return apiRequest<Quiz>("/quizzes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
