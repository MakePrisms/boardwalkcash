-- CreateTable
CREATE TABLE "SingleGiftCampaign" (
    "id" SERIAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nwcUri" TEXT NOT NULL,
    "giftId" INTEGER NOT NULL,
    "totalGifts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SingleGiftCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SingleGiftCampaignToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SingleGiftCampaign_giftId_key" ON "SingleGiftCampaign"("giftId");

-- CreateIndex
CREATE UNIQUE INDEX "_SingleGiftCampaignToUser_AB_unique" ON "_SingleGiftCampaignToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SingleGiftCampaignToUser_B_index" ON "_SingleGiftCampaignToUser"("B");

-- AddForeignKey
ALTER TABLE "SingleGiftCampaign" ADD CONSTRAINT "SingleGiftCampaign_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SingleGiftCampaignToUser" ADD CONSTRAINT "_SingleGiftCampaignToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "SingleGiftCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SingleGiftCampaignToUser" ADD CONSTRAINT "_SingleGiftCampaignToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
