-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "xHandle" TEXT,
    "userId" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_linkedUserId_key" ON "Contact"("userId", "linkedUserId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pubkey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("pubkey") ON DELETE SET NULL ON UPDATE CASCADE;
