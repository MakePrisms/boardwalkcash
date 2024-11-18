/*
  Warnings:

  - You are about to drop the column `gift` on the `MintlessTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `gift` on the `Token` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MintlessTransaction" DROP COLUMN "gift",
ADD COLUMN     "giftId" INTEGER;

-- AlterTable
ALTER TABLE "Token" DROP COLUMN "gift",
ADD COLUMN     "giftId" INTEGER;
