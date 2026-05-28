export type WordlePlayerState = {
  userId: number;
  finished: boolean;
  won: boolean | null;
  attemptsUsed: number | null;
  completedAt: string | null;
  currentGuess: number;
  turnStartedAt: string | null;
  timePerWordSeconds: number;
};

export type WordleState = {
  sharedWord: string | null;
  playersCompleted: number;
  totalPlayers: number;
  playersReady: number;
  playerStates: WordlePlayerState[];
};
