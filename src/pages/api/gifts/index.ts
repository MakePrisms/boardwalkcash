import { NextApiResponse } from 'next';
import { AuthenticatedRequest, GetAllGiftsResponse } from '@/types';
import { getAllGifts } from '@/lib/gifts';
import { runAuthMiddleware } from '@/utils/middleware';
import { getUserClaimedCampaignGifts } from '@/lib/userModels';

export default async function handler(
   req: AuthenticatedRequest,
   res: NextApiResponse<GetAllGiftsResponse | { error: string }>,
) {
   if (req.method === 'GET') {
      /* auth is optional, if authenticated user can get campaign gifts too */
      await runAuthMiddleware(req, res, true);

      try {
         let gifts = await getAllGifts(true);
         if (!req.authenticatedPubkey) {
            /* if not authenticated, filter out campaign gifts */
            gifts = gifts.filter(g => !g.SingleGiftCampaign);
         } else {
            /* if authenticated, include campaign gifts user has not claimed */
            const claimedGiftIds = await getUserClaimedCampaignGifts(req.authenticatedPubkey);
            if (claimedGiftIds.length > 0) {
               /* filter out campaign gifts user has claimed */
               gifts = gifts.filter(g => !claimedGiftIds.some(id => id === g.id));
            } else if (claimedGiftIds === null) {
               return res.status(404).json({ error: 'User not found' });
            }
         }

         res.status(200).json({
            gifts: gifts.map(g => {
               /* remove campaign from gift */
               const { SingleGiftCampaign, ...gift } = g;
               return { ...gift, campaignId: g.SingleGiftCampaign?.id };
            }),
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
