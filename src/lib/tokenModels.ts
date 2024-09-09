import { PostTokenRequest } from '@/types';
import prisma from './prisma';
import { getProofsFromToken, proofsLockedTo } from '@/utils/cashu';

export const createTokenInDb = async (data: PostTokenRequest, txid: string, isFee?: boolean) => {
   let recipientPubkey = null;
   const proofs = getProofsFromToken(data.token);
   const pubkeyLock = proofsLockedTo(proofs);
   if (pubkeyLock) {
      recipientPubkey = pubkeyLock.slice(2);
   }

   const token = await prisma.token.create({
      data: {
         ...data,
         id: txid,
         recipientPubkey,
         isFee,
      },
   });

   return token;
};

export const findTokenByTxId = async (txid: string) => {
   return await prisma.token.findUnique({
      where: {
         id: txid,
      },
   });
};
