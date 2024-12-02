import { getMsgFromUnknownError, TokenAlreadySpentError } from '@/utils/error';
import { corsMiddleware, runMiddleware } from '@/utils/middleware';
import { notifyTokenReceived } from '@/lib/notificationModels';
import { findContactByUsername } from '@/lib/contactModels';
import { getEncodedTokenV4, Proof } from '@cashu/cashu-ts';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTokenInDb } from '@/lib/tokenModels';
import {
   computeTxId,
   dissectToken,
   getCrossMintQuotes,
   getUnspentProofs,
   initializeWallet,
} from '@/utils/cashu';
import { convertToUnit } from '@/utils/convertToUnit';
import { Currency } from '@/types';

/* This endpoint is used for sending a token directly to a user's wallet. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, corsMiddleware);

   const { username } = req.query;

   if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
   }

   if (req.method === 'POST') {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
         return res.status(400).json({ error: 'Invalid token' });
      }

      try {
         const user = await findContactByUsername(username);
         if (!user) {
            return res.status(404).json({ error: 'User not found' });
         }

         if (!user.defaultMintUrl || !user.defaultUnit) {
            return res.status(400).json({ error: 'User has no default mint url or unit' });
         }

         /* create new CashuWallet to receive the token */
         const wallet = await initializeWallet(user.defaultMintUrl, { unit: user.defaultUnit });

         const { proofs, mintUrl, unit } = dissectToken(token);

         let newProofs: Proof[] = [];
         let changeToken: string | undefined;
         let amountClaimedSats: number;

         if (mintUrl === user.defaultMintUrl && unit === user.defaultUnit) {
            /* swap */
            const unspentProofs = await getUnspentProofs(wallet, proofs);

            newProofs = await wallet.receive({
               token: [{ proofs: unspentProofs, mint: mintUrl }],
               unit,
            });

            const proofAmt = newProofs.reduce((acc, p) => acc + p.amount, 0);
            amountClaimedSats = await convertToUnit(proofAmt, unit, Currency.SAT);
         } else {
            /* melt proofs then mint into user's default wallet */
            const meltWallet = await initializeWallet(mintUrl, { unit });

            const unspentProofs = await getUnspentProofs(meltWallet, proofs);

            const { mintQuote, meltQuote, amountToMint } = await getCrossMintQuotes(
               meltWallet,
               wallet,
               unspentProofs.reduce((acc, p) => acc + p.amount, 0),
            );

            const { change } = await meltWallet.meltTokens(meltQuote, unspentProofs);
            if (change.length > 0) {
               changeToken = getEncodedTokenV4({
                  token: [{ proofs: change, mint: meltWallet.mint.mintUrl }],
                  unit: meltWallet.keys.unit,
               });
            }

            const { proofs: mintedProofs } = await wallet.mintTokens(amountToMint, mintQuote.quote);
            newProofs = mintedProofs;
            amountClaimedSats = await convertToUnit(amountToMint, wallet.unit, Currency.SAT);
         }

         const newToken = getEncodedTokenV4({
            token: [{ proofs: newProofs, mint: wallet.mint.mintUrl }],
            unit: wallet.keys.unit,
         });

         const txid = computeTxId(newToken);
         await createTokenInDb({ token }, txid);
         await notifyTokenReceived(user.pubkey, JSON.stringify({ token: newToken }), txid);

         return res.status(200).json({
            status: 'success',
            txid,
            amountSats: amountClaimedSats,
            changeToken,
         });
      } catch (error) {
         if (error instanceof TokenAlreadySpentError) {
            return res.status(400).json({ error: 'Token already spent' });
         }
         return res
            .status(500)
            .json({ error: getMsgFromUnknownError(error, 'internal server error') });
      }
   } else {
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
