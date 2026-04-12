CREATE TABLE "QuizLeaderboard" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizLeaderboard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizLeaderboard_quizId_userId_key" ON "QuizLeaderboard"("quizId", "userId");
CREATE INDEX "QuizLeaderboard_quizId_totalScore_wins_idx" ON "QuizLeaderboard"("quizId", "totalScore", "wins");

ALTER TABLE "QuizLeaderboard"
ADD CONSTRAINT "QuizLeaderboard_quizId_fkey"
FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuizLeaderboard"
ADD CONSTRAINT "QuizLeaderboard_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
