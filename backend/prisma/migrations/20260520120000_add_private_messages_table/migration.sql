CREATE TABLE "PrivateMessage" (
  "id" SERIAL NOT NULL,
  "senderId" INTEGER NOT NULL,
  "receiverId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),

  CONSTRAINT "PrivateMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PrivateMessage"
ADD CONSTRAINT "PrivateMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PrivateMessage"
ADD CONSTRAINT "PrivateMessage_receiverId_fkey"
FOREIGN KEY ("receiverId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PrivateMessage_senderId_receiverId_createdAt_idx"
ON "PrivateMessage"("senderId", "receiverId", "createdAt");

CREATE INDEX "PrivateMessage_receiverId_senderId_createdAt_idx"
ON "PrivateMessage"("receiverId", "senderId", "createdAt");

CREATE INDEX "PrivateMessage_receiverId_readAt_createdAt_idx"
ON "PrivateMessage"("receiverId", "readAt", "createdAt");
