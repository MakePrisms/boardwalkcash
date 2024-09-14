-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "mintlessTransactionId" TEXT,
ALTER COLUMN "data" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_mintlessTransactionId_fkey" FOREIGN KEY ("mintlessTransactionId") REFERENCES "MintlessTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
