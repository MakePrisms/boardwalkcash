-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userPubkey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userPubkey_fkey" FOREIGN KEY ("userPubkey") REFERENCES "User"("pubkey") ON DELETE RESTRICT ON UPDATE CASCADE;
