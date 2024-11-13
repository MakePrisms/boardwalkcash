/*
  Warnings:

  - You are about to drop the `Proof` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Proof" DROP CONSTRAINT "Proof_mintKeysetId_fkey";

-- DropForeignKey
ALTER TABLE "Proof" DROP CONSTRAINT "Proof_userId_fkey";

-- DropTable
DROP TABLE "Proof";
