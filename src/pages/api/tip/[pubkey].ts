import { NextApiRequest, NextApiResponse } from 'next';
import { findUserByPubkey } from '@/lib/userModels';
import { initializeUsdWallet } from '@/utils/cashu';
import { LightningTipResponse } from '@/types';
import { createMintQuote } from '@/lib/mintQuoteModels';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method === 'GET') {
      // pubkey - receiving user's pubkey
      // amount - amount to tip in specified unit (includes fee)
      // unit - usd only
      // gift - gift name
      // fee - amount to send to boardwalk as fee
      const { pubkey, amount, unit, gift, fee = 0 } = req.query;

      if (!pubkey || !amount || !unit) {
         return res.status(400).json({ error: 'Missing required parameters' });
      }

      if (unit !== 'usd') {
         return res.status(400).json({ error: 'Invalid unit. Only usd is supported' });
      }

      try {
         const user = await findUserByPubkey(pubkey as string);

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

         const host = req.headers.host;
         const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
         const baseUrl = `${protocol}://${host}`;

         axios.post(`${baseUrl}/api/invoice/polling/${quote}?isTip=true`, {
            pubkey: user.pubkey,
            amount: amount,
            keysetId: wallet.keys.id,
            mintUrl: wallet.mint.mintUrl,
            gift,
            fee,
         });

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
