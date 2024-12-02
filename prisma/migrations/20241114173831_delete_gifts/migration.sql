/*
  Warnings:

  - You are about to drop the column `giftId` on the `SingleGiftCampaign` table. All the data in the column will be lost.
  - You are about to drop the `Gift` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[giftName]` on the table `SingleGiftCampaign` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `giftName` to the `SingleGiftCampaign` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Gift" DROP CONSTRAINT "Gift_creatorPubkey_fkey";

-- DropForeignKey
ALTER TABLE "SingleGiftCampaign" DROP CONSTRAINT "SingleGiftCampaign_giftId_fkey";

-- DropIndex
DROP INDEX "SingleGiftCampaign_giftId_key";

-- AlterTable
ALTER TABLE "SingleGiftCampaign" DROP COLUMN "giftId",
ADD COLUMN     "giftName" TEXT NOT NULL;

-- DropTable
DROP TABLE "Gift";

-- CreateIndex
CREATE UNIQUE INDEX "SingleGiftCampaign_giftName_key" ON "SingleGiftCampaign"("giftName");
