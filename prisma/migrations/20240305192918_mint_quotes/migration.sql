-- CreateTable
CREATE TABLE "MintQuote" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "request" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "expiryUnix" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pubkey" TEXT NOT NULL,

    CONSTRAINT "MintQuote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MintQuote" ADD CONSTRAINT "MintQuote_pubkey_fkey" FOREIGN KEY ("pubkey") REFERENCES "User"("pubkey") ON DELETE RESTRICT ON UPDATE CASCADE;
