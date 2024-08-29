/*
  Warnings:

  - You are about to drop the column `creatorId` on the `Gift` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Gift" DROP CONSTRAINT "Gift_creatorId_fkey";

-- DropIndex
DROP INDEX "Gift_creatorId_idx";

-- AlterTable
ALTER TABLE "Gift" DROP COLUMN "creatorId",
ADD COLUMN     "creatorPubkey" TEXT;

-- CreateIndex
CREATE INDEX "Gift_creatorPubkey_idx" ON "Gift"("creatorPubkey");

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_creatorPubkey_fkey" FOREIGN KEY ("creatorPubkey") REFERENCES "User"("pubkey") ON DELETE SET NULL ON UPDATE CASCADE;
