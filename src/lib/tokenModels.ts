import prisma from './prisma';

export const createTokenInDb = async (token: string, txid: string) => {
   return await prisma.token.create({
      data: {
         token,
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
