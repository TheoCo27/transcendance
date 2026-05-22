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
