-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "amount" INTEGER,
    "userPubkey" TEXT NOT NULL,
    "txid" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "reusable" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_userPubkey_fkey" FOREIGN KEY ("userPubkey") REFERENCES "User"("pubkey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_txid_fkey" FOREIGN KEY ("txid") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
