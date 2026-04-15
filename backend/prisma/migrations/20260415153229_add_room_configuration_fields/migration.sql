-- CreateEnum
CREATE TYPE "RoomGameType" AS ENUM ('wordle', 'memory');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "gameConfig" JSONB,
ADD COLUMN     "gameType" "RoomGameType",
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;
