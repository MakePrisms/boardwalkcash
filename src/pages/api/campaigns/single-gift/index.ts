import { NextApiResponse } from 'next';
import {
   createSingleGiftCampaign,
   deleteCampaign,
   getAllSingleGiftCampaigns,
   getSingleGiftCampaign,
} from '@/lib/campaignModels';
import { getGiftById } from '@/lib/gifts';
import { AuthenticatedRequest } from '@/types';
import { basicAuthMiddleware, runMiddleware } from '@/utils/middleware';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse<any>) {
   if (req.method === 'GET') {
      const { id, active } = req.query;
      try {
         if (id) {
            /* get a single campaign */
            if (typeof id !== 'number') {
               return res.status(400).json({ message: 'Invalid id' });
            }
            const campaign = await getSingleGiftCampaign(id);
            if (!campaign) {
               return res.status(404).json({ message: 'Campaign not found' });
            }
            return res.status(200).json(campaign);
         } else {
            /* get all campaigns */
            const campaigns = await getAllSingleGiftCampaigns(active === 'true');
            return res.status(200).json({
               campaigns: campaigns.map(c => {
                  const { nwcUri, ...campaign } = c;
                  return campaign;
               }),
            });
         }
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else if (req.method === 'POST') {
      await runMiddleware(req, res, basicAuthMiddleware);
      try {
         const { name, description, nwcUri, giftId, totalGifts } = req.body;

         if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'Name is required' });
         }
         if (!nwcUri || typeof nwcUri !== 'string') {
            return res.status(400).json({ message: 'NWC URI is required' });
         }

         if (!giftId || typeof giftId !== 'number') {
            return res.status(400).json({ message: 'Gift ID is required' });
         }

         if (!totalGifts || typeof totalGifts !== 'number') {
            return res.status(400).json({ message: 'Total gifts is required' });
         }

         const gift = await getGiftById(giftId);

         if (!gift) {
            return res.status(404).json({ message: 'Gift not found' });
         }

         await createSingleGiftCampaign({
            name,
            description,
            nwcUri,
            gift: {
               connect: {
                  id: giftId,
               },
            },
            totalGifts,
         });

         return res.status(200).json({ message: 'Campaign created' });
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else if (req.method === 'DELETE') {
      try {
         const { id } = req.query;

         if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'Invalid id' });
         }

         await deleteCampaign(Number(id));

         return res.status(200).json({ message: 'Campaign deleted' });
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
