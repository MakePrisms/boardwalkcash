-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nostrPubkey" TEXT;

-- CreateTable
CREATE TABLE "PendingOtp" (
    "id" SERIAL NOT NULL,
    "userPubkey" TEXT NOT NULL,
    "nostrPubkey" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingOtp_otpCode_key" ON "PendingOtp"("otpCode");

-- CreateIndex
CREATE INDEX "PendingOtp_otpCode_idx" ON "PendingOtp"("otpCode");
