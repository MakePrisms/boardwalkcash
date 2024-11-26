import { createUnlockedGift } from '@/lib/tokenModels';
import { PostTokenResponse, PostUnlockedGiftRequest } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method === 'POST') {
      try {
         const { txid, giftId } = req.body as PostUnlockedGiftRequest;

         await createUnlockedGift(txid, Number(giftId));

         return res.status(200).json({ txid } as PostTokenResponse);
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
