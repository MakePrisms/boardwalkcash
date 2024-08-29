/*
  Warnings:

  - You are about to drop the column `email` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `nickname` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `xHandle` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `cost` on the `Gift` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Gift` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Gift` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `MintQuote` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `gift` on the `Token` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenId]` on the table `MintQuote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenId]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "email",
DROP COLUMN "nickname",
DROP COLUMN "phoneNumber",
DROP COLUMN "xHandle";

-- AlterTable
ALTER TABLE "Gift" DROP COLUMN "cost",
DROP COLUMN "description",
DROP COLUMN "unit",
ADD COLUMN     "feeAmount" INTEGER,
ADD COLUMN     "feeDesc" TEXT,
ADD COLUMN     "feePubkeys" TEXT[],
ADD COLUMN     "feeSplits" INTEGER[],
ADD COLUMN     "feeType" TEXT;

-- AlterTable
ALTER TABLE "MintQuote" DROP COLUMN "token",
ADD COLUMN     "tokenId" TEXT;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "data",
ADD COLUMN     "contactId" INTEGER;

-- AlterTable
ALTER TABLE "Token" DROP COLUMN "gift",
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "giftId" INTEGER,
ADD COLUMN     "recipientId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MintQuote_tokenId_key" ON "MintQuote"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_tokenId_key" ON "Notification"("tokenId");

-- CreateIndex
CREATE INDEX "User_pubkey_idx" ON "User"("pubkey");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- AddForeignKey
ALTER TABLE "MintQuote" ADD CONSTRAINT "MintQuote_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
