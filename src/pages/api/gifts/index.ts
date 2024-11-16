import { NextApiResponse } from 'next';
import { AuthenticatedRequest, GetAllGiftsResponse } from '@/types';
import { runAuthMiddleware } from '@/utils/middleware';
import { getAllGifts } from '@/lib/gifts/giftHelpers';

export default async function handler(
   req: AuthenticatedRequest,
   res: NextApiResponse<GetAllGiftsResponse | { error: string }>,
) {
   if (req.method === 'GET') {
      /* auth is optional, if authenticated user can get campaign gifts too */
      await runAuthMiddleware(req, res, true);

      try {
         let gifts = await getAllGifts();

         res.status(200).json({
            gifts,
         });
      } catch (error) {
         console.error('Error getting all gifts:', error);
         res.status(500).json({ error: 'Internal Server Error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
