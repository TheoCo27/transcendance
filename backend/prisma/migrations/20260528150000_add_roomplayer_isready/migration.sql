-- Add readiness flag to room players for shared Wordle synchronization.
ALTER TABLE "RoomPlayer"
ADD COLUMN "isReady" BOOLEAN NOT NULL DEFAULT false;
