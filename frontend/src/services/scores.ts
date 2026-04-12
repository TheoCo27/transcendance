import { apiRequest } from "./api";

export type QuizLeaderboardEntry = {
  userId: number;
  username: string;
  score: number;
  wins: number;
  gamesPlayed: number;
};

export function getQuizLeaderboard(
  quizId: number,
  limit = 10,
): Promise<QuizLeaderboardEntry[]> {
  return apiRequest<QuizLeaderboardEntry[]>(
    `/scores/quizzes/${quizId}/leaderboard?limit=${limit}`,
  );
}
