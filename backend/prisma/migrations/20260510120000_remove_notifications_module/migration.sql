-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_recipientId_fkey";

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "NotificationAction";

-- DropEnum
DROP TYPE "NotificationResource";
