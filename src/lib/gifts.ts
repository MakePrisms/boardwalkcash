import { Gift } from '@prisma/client';
import prisma from './prisma';

export const getGiftById = async (id: number): Promise<Gift | null> => {
   return prisma.gift.findUnique({ where: { id } });
};

export const getAllGifts = async (): Promise<Gift[]> => {
   return prisma.gift.findMany();
};
