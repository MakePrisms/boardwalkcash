import type { NextApiRequest, NextApiResponse } from 'next';
import { runMiddleware, corsMiddleware } from '@/utils/middleware';
import { getMintQuote } from '@/lib/mintQuoteModels';
import { LightningTipStatusResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, corsMiddleware);

   if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
   }

   const { checkingId: quoteId } = req.query;

   if (!quoteId || typeof quoteId !== 'string') {
      return res.status(400).json({ error: 'Invalid quoteId' });
   }

   try {
      const mintQuote = await getMintQuote(quoteId);

      if (!mintQuote) {
         return res.status(404).json({ error: 'Mint quote not found' });
      }

      return res.status(200).json({
         paid: mintQuote.paid,
         quoteId: mintQuote.id,
         token: mintQuote.token,
      } as LightningTipStatusResponse);
   } catch (error) {
      console.error('Error fetching mint quote status:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
   }
}
