import { NextApiRequest, NextApiResponse } from 'next';
import { findUserByPubkey } from '@/lib/userModels';
import { initializeUsdWallet } from '@/utils/cashu';
import { LightningTipResponse } from '@/types';
import { createMintQuote } from '@/lib/mintQuoteModels';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method === 'GET') {
      // slug - user's pubkey
      // amount - amount to tip in specified unit
      // unit - usd only
      // gift - gift name
      const { slug, amount, unit, gift } = req.query;

      if (!slug || !amount || !unit) {
         return res.status(400).json({ error: 'Missing required parameters' });
      }

      if (unit !== 'usd') {
         return res.status(400).json({ error: 'Invalid unit. Only usd is supported' });
      }

      try {
         const user = await findUserByPubkey(slug as string);

         if (!user) {
            return res.status(404).json({ error: 'User not found' });
         }

         // TOOD: initialize with keys stored in db
         const wallet = await initializeUsdWallet(user.defaultMintUrl);

         const { request: invoice, quote } = await wallet.createMintQuote(
            parseFloat(amount as string),
         );

         await createMintQuote(
            quote,
            invoice,
            user.pubkey,
            wallet.keys.id,
            parseFloat(amount as string),
         );

         axios.post(
            `${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${quote}?isTip=true`,
            {
               pubkey: user.pubkey,
               amount: amount,
               keysetId: wallet.keys.id,
               mintUrl: wallet.mint.mintUrl,
               gift,
            },
         );

         return res.status(200).json({
            invoice,
            checkingId: quote,
         } as LightningTipResponse);
      } catch (error) {
         console.error('Error processing tip request:', error);
         return res.status(500).json({ error: 'Internal server error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
