/*
  Warnings:

  - Added the required column `unit` to the `Proof` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Proof" ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'usd';
