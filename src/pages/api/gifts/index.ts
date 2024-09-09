import { NextApiRequest, NextApiResponse } from 'next';
import { GetAllGiftsResponse } from '@/types';
import { getAllGifts } from '@/lib/gifts';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<GetAllGiftsResponse | { error: string }>,
) {
   if (req.method === 'GET') {
      try {
         const gifts = await getAllGifts();
         res.status(200).json({ gifts });
      } catch (error) {
         console.error('Error getting all gifts:', error);
         res.status(500).json({ error: 'Internal Server Error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
