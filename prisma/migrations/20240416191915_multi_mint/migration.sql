/*
  Warnings:

  - Added the required column `mintKeysetId` to the `MintQuote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mintKeysetId` to the `Proof` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defaultMintUrl` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MintQuote" ADD COLUMN     "mintKeysetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Proof" ADD COLUMN     "mintKeysetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedUnits" TEXT[],
ADD COLUMN     "defaultMintUrl" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Mint" (
    "url" TEXT NOT NULL,

    CONSTRAINT "Mint_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "MintKeyset" (
    "id" TEXT NOT NULL,
    "keys" TEXT[],
    "unit" TEXT NOT NULL,
    "mintUrl" TEXT NOT NULL,

    CONSTRAINT "MintKeyset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultMintUrl_fkey" FOREIGN KEY ("defaultMintUrl") REFERENCES "Mint"("url") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_mintKeysetId_fkey" FOREIGN KEY ("mintKeysetId") REFERENCES "MintKeyset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MintQuote" ADD CONSTRAINT "MintQuote_mintKeysetId_fkey" FOREIGN KEY ("mintKeysetId") REFERENCES "MintKeyset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MintKeyset" ADD CONSTRAINT "MintKeyset_mintUrl_fkey" FOREIGN KEY ("mintUrl") REFERENCES "Mint"("url") ON DELETE RESTRICT ON UPDATE CASCADE;
