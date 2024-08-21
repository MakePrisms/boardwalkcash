import { PostTokenRequest } from '@/types';
import prisma from './prisma';

export const createTokenInDb = async (data: PostTokenRequest, txid: string) => {
   return await prisma.token.create({
      data: {
         ...data,
         id: txid,
      },
   });
};

export const findTokenByTxId = async (txid: string) => {
   return await prisma.token.findUnique({
      where: {
         id: txid,
      },
   });
};
