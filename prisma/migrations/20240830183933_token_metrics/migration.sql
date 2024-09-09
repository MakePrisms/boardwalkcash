-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "createdByPubkey" TEXT,
ADD COLUMN     "recipientPubkey" TEXT;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_recipientPubkey_fkey" FOREIGN KEY ("recipientPubkey") REFERENCES "User"("pubkey") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_createdByPubkey_fkey" FOREIGN KEY ("createdByPubkey") REFERENCES "User"("pubkey") ON DELETE SET NULL ON UPDATE CASCADE;
