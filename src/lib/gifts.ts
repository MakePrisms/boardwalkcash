import { Gift } from '@prisma/client';
import prisma from './prisma';

export const getGiftByName = async (name: string): Promise<Gift | null> => {
   return prisma.gift.findUnique({ where: { name } });
};

export const getAllGifts = async (): Promise<Gift[]> => {
   return prisma.gift.findMany();
};
