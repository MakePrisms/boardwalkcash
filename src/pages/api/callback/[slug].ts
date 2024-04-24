import axios from 'axios';
import crypto from 'crypto';
import { runMiddleware, corsMiddleware } from '@/utils/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { findUserByPubkeyWithMint } from '@/lib/userModels';
import { createMintQuote } from '@/lib/mintQuoteModels';

const customMintQuoteRequest = async (
   amountSat: number,
   amountUsd: number,
   wallet: CashuWallet,
) => {
   const isBitcoinMints = wallet.mint.mintUrl.includes('mint.bitcoinmints.com');
   const isLocalHost = wallet.mint.mintUrl.includes('localhost');
   if (!isBitcoinMints && !isLocalHost) {
      try {
         return await wallet.getMintQuote(amountUsd);
      } catch (error) {
         console.error('Error getting mint quote:', error);
         throw error;
      }
   }

   const usdKeysetId = await wallet.mint
      .getKeys()
      .then(keys => keys.keysets.find(key => key.unit === 'usd')?.id);

   if (!usdKeysetId) {
      throw new Error('No USD keyset found');
   }

   const mintQuoteReq = {
      amount: amountSat,
      keysetId: usdKeysetId,
      unit: 'sat',
   };

   console.log('Mint Quote Request:', mintQuoteReq);

   try {
      const mintQuote = await fetch(`${wallet.mint.mintUrl}/v1/mint/quote/bolt11`, {
         method: 'POST',
         body: JSON.stringify(mintQuoteReq),
         headers: { 'Content-Type': 'application/json' },
      }).then(res => res.json());

      console.log('Mint Quote:', mintQuote);

      return mintQuote;
   } catch (e) {
      console.error('Error getting mint quote:', e);
      throw e;
   }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, corsMiddleware);

   const { slug, ...queryParams } = req.query;

   if (!slug || slug === 'undefined') {
      res.status(404).json({ error: 'Not found' });
      return;
   }

   const user = await findUserByPubkeyWithMint(slug.toString());

   if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
   }

   const DEFAULT_UNIT = 'usd';

   const keyset = user.defaultMint.keysets.find(keyset => keyset.unit === DEFAULT_UNIT);

   console.log('Keyset:', keyset);

   if (!keyset) {
      res.status(404).json({ error: 'Users default mint does not support default unit' });
      return;
   }

   const keys = keyset.keys.reduce(
      (acc, key) => {
         const [tokenAmt, pubkey] = key.split(':');
         acc[tokenAmt] = pubkey;
         return acc;
      },
      {} as Record<string, string>,
   );

   const wallet = new CashuWallet(new CashuMint(user.defaultMint.url), {
      keys: {
         id: keyset.id,
         keys,
         unit: keyset.unit,
      },
   });

   if (slug === user.pubkey) {
      // Ensure amount is treated as a string, even if it comes as an array
      const amount = Array.isArray(queryParams.amount) ? queryParams.amount[0] : queryParams.amount;

      if (amount) {
         const metadata = [['text/plain', 'Boardwalk Cash lightning address endpoint']];

         const metadataString = JSON.stringify(metadata);

         const hash = crypto.createHash('sha256').update(metadataString).digest('hex');

         // Can't do anything with the description hash with the current cashu-ts API
         const descriptionHash = Buffer.from(hash, 'hex').toString('base64'); // Encoding as base64

         // Convert amount from millisatoshis to satoshis
         const amountSat = parseInt(amount) / 1000;

         const amountUsd = await fetch('https://mempool.space/api/v1/prices').then(res =>
            res.json().then(data => {
               const usdBtc = data.USD;
               console.log('USD to BTC rate:', usdBtc);
               const usdSat = usdBtc / 100_000_000;
               console.log('USD to SAT rate:', usdSat);
               console.log('usd', amountSat * usdSat);
               return parseFloat((amountSat * usdSat * 100).toFixed(2));
            }),
         );

         const { quote, request } = await customMintQuoteRequest(amountSat, amountUsd, wallet);

         console.log('Quote:', quote);
         console.log('Request:', request);

         if (request) {
            await createMintQuote(quote, request, user.pubkey, keyset.id);

            // start polling
            axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${quote}`, {
               pubkey: user.pubkey,
               amount: amountUsd,
               keysetId: keyset.id,
               mintUrl: user.defaultMint.url,
            });

            return res.status(200).json({
               pr: request,
            });
         } else {
            res.status(500).json({ error: 'Error generating invoice' });
            return;
         }
      } else {
         res.status(400).json({ error: 'Amount not specified' });
         return;
      }
   }
}
