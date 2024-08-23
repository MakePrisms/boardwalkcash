import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CashuMint, CashuWallet, getEncodedToken } from '@cashu/cashu-ts';
import { createManyProofs } from '@/lib/proofModels';
import { findUserByPubkey, updateUser } from '@/lib/userModels';
import { updateMintQuote } from '@/lib/mintQuoteModels';
import { NotificationType, ProofData } from '@/types';
import { findMintByUrl } from '@/lib/mintModels';
import { createNotification, notifyTokenReceived } from '@/lib/notificationModels';
import { computeTxId, getProofsFromToken } from '@/utils/cashu';
import { createTokenInDb } from '@/lib/tokenModels';

interface PollingRequest {
   pubkey: string;
   amount: number;
}

export type PollingApiResponse = {
   success: boolean;
   message: string;
   user?: {
      receiving: boolean;
   };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
   const { slug } = req.query;
   const { mintUrl, keysetId, gift } = req.body;
   const isTip = req.query.isTip === 'true';

   if (!mintUrl) {
      res.status(400).send({ success: false, message: 'No mint URL provided.' });
      return;
   }

   const mintLocal = await findMintByUrl(mintUrl);

   const keyset = mintLocal.keysets.find(keyset => keyset.id === keysetId);
   if (!keyset) {
      res.status(404).send({ success: false, message: 'Keyset not found.' });
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

   const wallet = new CashuWallet(new CashuMint(mintLocal.url), {
      keys: {
         id: keysetId,
         keys,
         unit: keyset.unit,
      },
   });

   if (typeof slug !== 'string') {
      res.status(400).send({ success: false, message: 'Invalid hash provided.' });
      return;
   }

   const { pubkey, amount }: PollingRequest = req.body;

   // Set user's "receiving" to true at the start of polling
   !isTip && (await updateUser(pubkey, { receiving: true }));

   try {
      let paymentConfirmed = false;
      const maxAttempts = 90;
      let attempts = 0;
      let interval = 2000;

      const user = await findUserByPubkey(pubkey);
      if (!user) {
         !isTip && (await updateUser(pubkey, { receiving: false }));
         res.status(404).send({ success: false, message: 'User not found.' });
         return;
      }

      while (!paymentConfirmed && attempts < maxAttempts) {
         console.log('polling', attempts);

         if (attempts === 10) {
            !isTip && (await updateUser(pubkey, { receiving: false }));
         }

         try {
            const { proofs } = await wallet.mintTokens(amount, slug, {
               keysetId: keyset.id,
               pubkey: isTip ? `02${pubkey}` : undefined, // if its a tip, we should lock the tokens. TOOD: always lock to pubkey, this will just require that the frontend unlocks them when polling to updateProofsAndBalance
            });

            let proofsPayload: ProofData[] = proofs.map(proof => {
               return {
                  proofId: proof.id,
                  secret: proof.secret,
                  amount: proof.amount,
                  C: proof.C,
                  userId: user.id,
                  mintKeysetId: keysetId,
               };
            });

            let created;
            let token: string | undefined;
            if (isTip) {
               /* if its a tip, send as a notification */
               token = getEncodedToken({ token: [{ proofs, mint: wallet.mint.mintUrl }] });
               /* not sure why gift is ending up as 'undefined' */
               if (gift && gift !== 'undefined') {
                  const proofs = getProofsFromToken(token);

                  const txid = computeTxId(proofs);

                  await createTokenInDb({ token, gift }, txid);

                  created = await notifyTokenReceived(pubkey, JSON.stringify({ token }), txid);
               } else {
                  created = await createNotification(pubkey, NotificationType.TIP, token);
               }
            } else {
               created = await createManyProofs(proofsPayload);
            }

            if (!created) {
               !isTip && (await updateUser(pubkey, { receiving: false }));
               res.status(500).send({ success: false, message: 'Failed to create proofs.' });
               return;
            }

            await updateMintQuote(slug, { paid: true, token });

            !isTip && (await updateUser(pubkey, { receiving: false }));

            res.status(200).send({
               success: true,
               message: 'Payment confirmed and proofs created.',
               user: { receiving: user.receiving },
            } as PollingApiResponse);
            return;
         } catch (e) {
            if (e instanceof Error) {
               console.log('quote not paid', e.message);
               attempts++;
               await new Promise(resolve => setTimeout(resolve, interval));
            } else {
               !isTip && (await updateUser(pubkey, { receiving: false }));
               throw e;
            }
         }
      }

      if (!paymentConfirmed) {
         await updateUser(pubkey, { receiving: false });
         res.status(408).send({ success: false, message: 'Payment confirmation timeout.' });
      }
   } catch (error) {
      await updateUser(pubkey, { receiving: false });
      console.error('Error during payment status check:', error);
      res.status(500).send({ success: false, message: 'Internal server error.' });
   }
}
