-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mintlessReceive" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MintlessTransaction" (
    "id" TEXT NOT NULL,
    "gift" TEXT,
    "notificationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "recipientPubkey" TEXT NOT NULL,
    "createdByPubkey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFee" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MintlessTransaction_pkey" PRIMARY KEY ("id")
);
