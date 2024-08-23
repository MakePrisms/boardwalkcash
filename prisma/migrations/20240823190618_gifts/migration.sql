-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "tokenId" TEXT;

-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "gift" TEXT;

-- CreateTable
CREATE TABLE "Gift" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'usd',
    "description" TEXT,
    "imageUrlSelected" TEXT NOT NULL,
    "imageUrlUnselected" TEXT NOT NULL,
    "creatorId" INTEGER,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gift_name_key" ON "Gift"("name");

-- CreateIndex
CREATE INDEX "Gift_creatorId_idx" ON "Gift"("creatorId");

-- CreateIndex
CREATE INDEX "Gift_name_idx" ON "Gift"("name");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
