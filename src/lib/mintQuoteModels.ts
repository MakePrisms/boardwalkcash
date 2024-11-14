import prisma from './prisma';
import { decodeBolt11 } from '@/utils/bolt11';

export const createMintQuote = async (
   quoteId: string,
   request: string,
   pubkey: string,
   keysetId: string,
   amountUnit?: number,
) => {
   const { amountSat: amount, expiryUnixMs: expiry } = decodeBolt11(request);

   if (!amount) {
      throw new Error('Amountless invoices are not supported');
   }

   const quote = await prisma.mintQuote.create({
      data: {
         id: quoteId,
         request,
         pubkey,
         amount: amountUnit ? amountUnit : amount, // this is a hack to get the amount in the correct unit
         expiryUnix: expiry,
         paid: false,
         mintKeysetId: keysetId,
      },
   });
   return quote;
};

export const findMintQuotesToRedeem = async () => {
   const nowUnix = Math.floor(Date.now() / 1000);
   const threeMinutesAgo = new Date(new Date().getTime() - 3 * 60 * 1000);

   const quotes = await prisma.mintQuote.findMany({
      where: {
         paid: false,
         expiryUnix: {
            gt: nowUnix, // Expiry is in the future
         },
         createdAt: {
            lt: threeMinutesAgo, // polling times out after 3 minutes
         },
      },
      include: {
         mintKeyset: true,
      },
   });
   return quotes;
};

export const updateMintQuote = async (quoteId: string, data: { paid: boolean; token?: string }) => {
   const quote = await prisma.mintQuote.update({
      where: {
         id: quoteId,
      },
      data,
   });
   return quote;
};

export const getMintQuote = async (quoteId: string) => {
   const quote = await prisma.mintQuote.findUnique({
      where: {
         id: quoteId,
      },
      include: {
         mintKeyset: true,
      },
   });
   return quote;
};
