import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { createManyProofs } from '@/lib/proofModels';
import { findUserByPubkey, updateUser } from '@/lib/userModels';
import { updateMintQuote } from '@/lib/mintQuoteModels';
import { ProofData } from '@/types';
import { findMintByUrl } from '@/lib/mintModels';

interface PollingRequest {
   pubkey: string;
   amount: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
   const { slug } = req.query;
   const { mintUrl, keysetId } = req.body;

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
   await updateUser(pubkey, { receiving: true });

   try {
      let paymentConfirmed = false;
      const maxAttempts = 90;
      let attempts = 0;
      let interval = 2000;

      const user = await findUserByPubkey(pubkey);
      if (!user) {
         await updateUser(pubkey, { receiving: false });
         res.status(404).send({ success: false, message: 'User not found.' });
         return;
      }

      while (!paymentConfirmed && attempts < maxAttempts) {
         console.log('polling', attempts);

         if (attempts === 10) {
            await updateUser(pubkey, { receiving: false });
         }

         try {
            const { proofs } = await wallet.mintTokens(amount, slug, { keysetId: keyset.id });

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

            const created = await createManyProofs(proofsPayload);

            console.log('Proofs created:', created);

            if (!created) {
               await updateUser(pubkey, { receiving: false });
               res.status(500).send({ success: false, message: 'Failed to create proofs.' });
               return;
            }

            await updateMintQuote(slug, { paid: true });

            await updateUser(pubkey, { receiving: false });

            res.status(200).send({
               success: true,
               message: 'Payment confirmed and proofs created.',
               user: { receiving: user.receiving },
            });
            return;
         } catch (e) {
            if (e instanceof Error) {
               console.log('quote not paid', e.message);
               attempts++;
               await new Promise(resolve => setTimeout(resolve, interval));
            } else {
               await updateUser(pubkey, { receiving: false });
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
