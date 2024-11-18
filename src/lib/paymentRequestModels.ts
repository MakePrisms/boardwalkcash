import prisma from '@/lib/prisma';
import { computeTxId } from '@/utils/cashu';
import { Prisma } from '@prisma/client';

export const createPaymentRequest = async (data: Prisma.PaymentRequestCreateInput) => {
   return await prisma.paymentRequest.create({ data });
};

export const getPaymentRequestById = async (id: string) => {
   return await prisma.paymentRequest.findUnique({ where: { id } });
};

export const getPaymentRequestByIdIncludeToken = async (id: string) => {
   return await prisma.paymentRequest.findUnique({
      where: { id },
      include: { tokens: true },
   });
};

export const markPaymentRequestAsPaid = async (id: string, token: string) => {
   const txid = computeTxId(token);
   return await prisma.paymentRequest.update({
      where: { id },
      data: {
         paid: true,
         tokens: {
            create: {
               id: txid,
               token,
            },
         },
      },
      include: { tokens: true },
   });
};

export const addTokenToPaymentRequest = async (id: string, token: string) => {
   return await prisma.paymentRequest.update({
      where: { id },
      data: {
         tokens: {
            create: {
               id: computeTxId(token),
               token,
            },
         },
      },
   });
};
