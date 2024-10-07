import { NextApiRequest, NextApiResponse } from 'next';
import { authMiddleware, runMiddleware } from '@/utils/middleware';
import { findUserByPubkey } from '@/lib/userModels';
import { initializeWallet } from '@/utils/cashu';
import { createMintQuote } from '@/lib/mintQuoteModels';
import axios from 'axios';
import { LightningTipResponse } from '@/types';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<LightningTipResponse | { error: string }>,
) {
   await runMiddleware(req, res, authMiddleware);
   const { pubkey } = req.query;

   if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({ error: 'Invalid pubkey' });
   }

   if (req.method === 'GET') {
      const { amount, keysetId } = req.query;

      if (!keysetId || typeof keysetId !== 'string') {
         return res.status(400).json({ error: 'Invalid keysetId' });
      }

      let amountUnit = parseFloat(amount as string);
      if (isNaN(amountUnit)) {
         return res.status(400).json({ error: 'Invalid amount' });
      }

      try {
         const user = await findUserByPubkey(pubkey);

         if (!user) {
            return res.status(404).json({ error: 'User not found' });
         }

         const wallet = await initializeWallet(user.defaultMintUrl, {
            keysetId: keysetId,
         });

         const { request: invoice, quote } = await wallet.createMintQuote(amountUnit);

         await createMintQuote(quote, invoice, user.pubkey, wallet.keys.id, amountUnit);

         const host = req.headers.host;
         const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
         const baseUrl = `${protocol}://${host}`;

         // TODO: give the initialized wallet to the polling endpoint
         axios.post(`${baseUrl}/api/invoice/polling/${quote}`, {
            pubkey: user.pubkey,
            amount: amountUnit,
            keysetId: wallet.keys.id,
            mintUrl: wallet.mint.mintUrl,
         });

         return res.status(200).json({ invoice, checkingId: quote });
      } catch (error) {
         console.error('Error receiving:', error);
         return res.status(500).json({ error: 'Internal server error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
