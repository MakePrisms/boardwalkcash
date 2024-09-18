import { Gift, SingleGiftCampaign } from '@prisma/client';
import prisma from './prisma';

export const getGiftByName = async (name: string): Promise<Gift | null> => {
   return prisma.gift.findUnique({ where: { name } });
};

export const getAllGifts = async (): Promise<
   (Gift & { SingleGiftCampaign: SingleGiftCampaign | null })[]
> => {
   return prisma.gift.findMany({
      include: {
         SingleGiftCampaign: {
            include: {
               claimedBy: true,
            },
            where: {
               active: true,
            },
         },
      },
   });
};

export const getGiftById = async (id: number): Promise<Gift | null> => {
   return prisma.gift.findUnique({ where: { id } });
};
