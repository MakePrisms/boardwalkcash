/*
  Warnings:

  - You are about to drop the column `giftName` on the `SingleGiftCampaign` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[giftId]` on the table `SingleGiftCampaign` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `giftId` to the `SingleGiftCampaign` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SingleGiftCampaign_giftName_key";

-- AlterTable
ALTER TABLE "SingleGiftCampaign" DROP COLUMN "giftName",
ADD COLUMN     "giftId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SingleGiftCampaign_giftId_key" ON "SingleGiftCampaign"("giftId");
