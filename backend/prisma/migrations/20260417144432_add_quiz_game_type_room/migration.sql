-- AlterEnum
ALTER TYPE "RoomGameType" ADD VALUE 'quiz';

-- AlterTable
ALTER TABLE "QuizLeaderboard" ALTER COLUMN "updatedAt" DROP DEFAULT;
