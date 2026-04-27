-- CreateEnum
CREATE TYPE "NotificationAction" AS ENUM ('created', 'updated', 'deleted');

-- CreateEnum
CREATE TYPE "NotificationResource" AS ENUM (
    'user',
    'profile',
    'avatar',
    'room',
    'quiz',
    'friend_request',
    'private_message'
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "actorUserId" INTEGER,
    "resource" "NotificationResource" NOT NULL,
    "resourceId" INTEGER,
    "action" "NotificationAction" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx"
ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_idx"
ON "Notification"("recipientId", "readAt");

-- AddForeignKey
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
