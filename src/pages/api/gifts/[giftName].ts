import { NextApiRequest, NextApiResponse } from 'next';
import { Gift } from '@prisma/client';
import { GetGiftResponse } from '@/types';
import prisma from '@/lib/prisma';

async function getGift(name: string): Promise<Gift | null> {
   return prisma.gift.findUnique({ where: { name } });
}

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<GetGiftResponse | { error: string }>,
) {
   const { giftName } = req.query;

   if (!giftName || typeof giftName !== 'string') {
      return res.status(400).json({ error: 'Invalid gift name' });
   }

   if (req.method === 'GET') {
      try {
         const gift = await getGift(giftName);
         if (!gift) {
            return res.status(404).json({ error: 'Gift not found' });
         }
         res.status(200).json(gift);
      } catch (error) {
         console.error('Error getting all gifts:', error);
         res.status(500).json({ error: 'Internal Server Error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
