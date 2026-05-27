import { apiRequest } from "./api";

export type GameLeaderboardEntry = {
  userId: number;
  score: number;
};

export type WordlePlayerState = {
  userId: number;
  finished: boolean;
  won: boolean | null;
  attemptsUsed: number | null;
  completedAt: string | null;
};

export type WordleState = {
  sharedWord: string | null;
  playersCompleted: number;
  totalPlayers: number;
  playerStates: WordlePlayerState[];
};

export type GameState = {
  roomId: number;
  status: "waiting" | "playing" | "finished";
  currentQuestionId: number | null;
  currentQuestion?: {
    id: number;
    text: string;
    options: string[];
  } | null;
  currentQuestionNumber: number;
  totalQuestions: number;
  questionDurationMs: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  answersForCurrentQuestion: number;
  totalAnswers: number;
  leaderboard: GameLeaderboardEntry[];
  winnerUserId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  wordle: WordleState | null;
  updatedAt: string;
};

export function getGameState(roomId: number): Promise<GameState> {
  return apiRequest<GameState>(`/game/${roomId}/state`);
}
