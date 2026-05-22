UPDATE "Room"
SET "gameType" = NULL
WHERE "gameType" = 'memory';

CREATE TYPE "RoomGameType_new" AS ENUM ('wordle', 'quiz');

ALTER TABLE "Room"
ALTER COLUMN "gameType" TYPE "RoomGameType_new"
USING (
  CASE
    WHEN "gameType"::text = 'wordle' THEN 'wordle'::"RoomGameType_new"
    WHEN "gameType"::text = 'quiz' THEN 'quiz'::"RoomGameType_new"
    ELSE NULL
  END
);

DROP TYPE "RoomGameType";

ALTER TYPE "RoomGameType_new" RENAME TO "RoomGameType";
