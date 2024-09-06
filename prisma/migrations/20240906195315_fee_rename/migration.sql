/*
  Warnings:

  - You are about to drop the column `cost` on the `Gift` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Gift" DROP COLUMN "cost",
ADD COLUMN     "fee" INTEGER;
