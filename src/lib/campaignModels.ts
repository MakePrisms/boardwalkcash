import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { setGiftStatus } from './gifts';

export const createSingleGiftCampaign = async (data: Prisma.SingleGiftCampaignCreateInput) => {
   return prisma.singleGiftCampaign.create({
      data,
   });
};

export const getSingleGiftCampaign = async (id: number) => {
   return prisma.singleGiftCampaign.findUnique({
      where: {
         id,
      },
      include: {
         claimedBy: true,
         gift: true,
      },
   });
};

export const getAllSingleGiftCampaigns = async (active: boolean) => {
   return prisma.singleGiftCampaign.findMany({
      where: { active },
      include: { gift: true, claimedBy: true },
   });
};

/* add user to claimed campaign gifts */
export const addUserToClaimedCampaignGifts = async (
   id: number,
   pubkey: string,
   active: boolean,
) => {
   await prisma.singleGiftCampaign.update({
      where: {
         id,
      },
      data: {
         claimedBy: {
            connect: {
               pubkey,
            },
         },
         active,
      },
   });
};

export const setCampaignInactive = async (id: number) => {
   await prisma.singleGiftCampaign.update({
      where: {
         id,
      },
      data: {
         active: false,
      },
   });
};

export const deleteCampaign = async (id: number) => {
   const campaign = await prisma.singleGiftCampaign.delete({
      where: {
         id,
      },
   });

   if (campaign) {
      setGiftStatus(campaign.giftId, false);
   }
};
