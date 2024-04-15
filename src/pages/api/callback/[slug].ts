import axios from 'axios';
import crypto from 'crypto';
import { runMiddleware, corsMiddleware } from '@/utils/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { findUserByPubkey } from '@/lib/userModels';
import { createMintQuote } from '@/lib/mintQuoteModels';

const BACKEND_URL = process.env.BACKEND_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, corsMiddleware);

   const { slug, ...queryParams } = req.query;

   if (!slug || slug === 'undefined') {
      res.status(404).json({ error: 'Not found' });
      return;
   }

   const wallet = new CashuWallet(new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!));

   const user = await findUserByPubkey(slug.toString());

   if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
   }

   if (slug === user.pubkey) {
      // Ensure amount is treated as a string, even if it comes as an array
      const amount = Array.isArray(queryParams.amount) ? queryParams.amount[0] : queryParams.amount;

      if (amount) {
         const metadata = [['text/plain', 'quickcashu lightning address endpoint']];

         const metadataString = JSON.stringify(metadata);

         const hash = crypto.createHash('sha256').update(metadataString).digest('hex');

         // Can't do anything with the description hash with the current cashu-ts API
         const descriptionHash = Buffer.from(hash, 'hex').toString('base64'); // Encoding as base64

         // Convert amount from millisatoshis to satoshis
         const value = parseInt(amount) / 1000;

         if (value < 1) {
            res.status(400).json({ error: 'Amount too low' });
            return;
         } else {
            const { quote, request } = await wallet.getMintQuote(value);

            if (request) {
               await createMintQuote(quote, request, user.pubkey);

               // start polling
               axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${quote}`, {
                  pubkey: user.pubkey,
                  amount: value,
               });

               return res.status(200).json({
                  pr: request,
               });
            } else {
               res.status(500).json({ error: 'Error generating invoice' });
               return;
            }
         }
      } else {
         res.status(400).json({ error: 'Amount not specified' });
         return;
      }
   }
}
