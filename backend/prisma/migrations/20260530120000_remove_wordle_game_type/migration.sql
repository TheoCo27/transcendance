UPDATE "Room"
SET "gameConfig" = NULL
WHERE "gameType" = 'wordle';

CREATE TYPE "RoomGameType_new" AS ENUM ('quiz');

ALTER TABLE "Room"
ALTER COLUMN "gameType" TYPE "RoomGameType_new"
USING (
  CASE
    WHEN "gameType"::text = 'quiz' THEN 'quiz'::"RoomGameType_new"
    ELSE NULL
  END
);

DROP TYPE "RoomGameType";

ALTER TYPE "RoomGameType_new" RENAME TO "RoomGameType";
