import prisma from './prisma';
import { getAmountAndExpiryFromInvoice } from '@/utils/bolt11';

export const createMintQuote = async (quoteId: string, request: string, pubkey: string) => {
    const { amount, expiry } = getAmountAndExpiryFromInvoice(request);

    const quote = await prisma.mintQuote.create({
        data: {
            id: quoteId,
            request,
            pubkey,
            amount,
            expiryUnix: expiry,
            paid: false
        },
    });
    return quote;
}

export const findMintQuotesToRedeem = async () => {
    const nowUnix = Math.floor(Date.now() / 1000);
    const threeMinutesAgo = new Date(new Date().getTime() - 3 * 60 * 1000);

    const quotes = await prisma.mintQuote.findMany({
        where: {
            paid: false,
            expiryUnix: {
                gt: nowUnix // Expiry is in the future
            },
            createdAt: {
                lt: threeMinutesAgo // polling times out after 3 minutes
            }
        }
    });
    return quotes;
}

export const updateMintQuote = async (quoteId: string, data: {paid: boolean}) => {
    const quote = await prisma.mintQuote.update({
        where: {
            id: quoteId
        },
        data
    });
    return quote;
}