export type RoomConfigForm = {
  name: string;
  quizId: number | null;
  gameType: "wordle" | "memory" | "quiz";
  wordleWordLength: number;
  wordleMaxAttempts: number;
  memoryPairsCount: number;
};

export type LeaderboardEntry = {
  userId: number;
  username: string;
  avatarUrl: string | null;
  score: number;
};

export type ChatEntry = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
  username: string;
  avatarUrl: string | null;
  isSelf: boolean;
};
