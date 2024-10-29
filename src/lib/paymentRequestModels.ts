import prisma from '@/lib/prisma';
import { computeTxId } from '@/utils/cashu';
import { Prisma } from '@prisma/client';

export const createPaymentRequest = async (data: Prisma.PaymentRequestCreateInput) => {
   return await prisma.paymentRequest.create({ data });
};

export const getPayentRequestById = async (id: string) => {
   return await prisma.paymentRequest.findUnique({ where: { id } });
};

export const getPayentRequestByIdIncludeToken = async (id: string) => {
   return await prisma.paymentRequest.findUnique({
      where: { id },
      include: { token: true },
   });
};

export const markPaymentRequestAsPaid = async (id: string, token: string) => {
   const txid = computeTxId(token);
   return await prisma.paymentRequest.update({
      where: { id },
      data: {
         paid: true,
         token: {
            create: {
               id: txid,
               token,
            },
         },
      },
      include: { token: true },
   });
};
