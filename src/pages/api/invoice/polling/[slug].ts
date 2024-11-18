import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEncodedTokenV4, Proof } from '@cashu/cashu-ts';
import { findUserByPubkey, updateUser } from '@/lib/userModels';
import { updateMintQuote } from '@/lib/mintQuoteModels';
import { InvoicePollingRequest, NotificationType } from '@/types';
import { createNotification, notifyTokenReceived } from '@/lib/notificationModels';
import {
   computeTxId,
   createPreferredProofsForFee,
   getProofsForPreference,
   initializeWallet,
} from '@/utils/cashu';
import { createTokenInDb } from '@/lib/tokenModels';
import { lookupGiftById } from '@/lib/gifts/giftHelpers';
import { getRecipientPubkeyFromGift } from '@/utils';

export type PollingApiResponse = {
   success: boolean;
   message: string;
   user?: {
      receiving: boolean;
   };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
   const { slug } = req.query;
   /* amount is total amount to send, including fee */
   const { mintUrl, keysetId, giftId, pubkey, amount, fee = 0 } = req.body as InvoicePollingRequest;

   if (req.query.isTip !== 'true') {
      throw new Error('This endpoint should only be used for tips');
   }

   if (!mintUrl) {
      res.status(400).send({ success: false, message: 'No mint URL provided.' });
      return;
   }

   const giftFromDB = giftId ? await lookupGiftById(Number(giftId)) : null;

   // NOTE: this should currently throw an error if the keyset is no longer active
   const wallet = await initializeWallet(mintUrl, { keysetId: keysetId });

   if (typeof slug !== 'string') {
      res.status(400).send({ success: false, message: 'Invalid hash provided.' });
      return;
   }

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
            let proofsToSendToUser: Proof[] = [];
            if (fee === 0) {
               const { proofs } = await wallet.mintTokens(amount, slug, {
                  keysetId: keysetId,
                  pubkey: `02${pubkey}`,
               });
               proofsToSendToUser = proofs;
            } else {
               /* have to create unlocked proofs, then lock them individually because cashu-ts doesn't support locking all at once */

               /* clalculate amount preferences so we can have the correct proofs for fee */
               const { amountPreference, feePreference } = createPreferredProofsForFee(
                  fee,
                  amount - fee,
               );

               /* create all the unlocked proofs */
               const { proofs } = await wallet.mintTokens(amount, slug, {
                  keysetId: keysetId,
                  preference: [...amountPreference, ...feePreference],
               });

               /* extract correct proofs for each preference */
               const feeProofs = getProofsForPreference(proofs, feePreference);
               const amountProofs = getProofsForPreference(
                  proofs.filter(p => !feeProofs.includes(p)),
                  amountPreference,
               );

               /* lock the user's tokens */
               const { send: lockedUserProofs } = await wallet.send(amount - fee, amountProofs, {
                  keysetId: keysetId,
                  pubkey: '02' + pubkey,
               });
               proofsToSendToUser = lockedUserProofs;

               let recipient: string | undefined;
               if (giftFromDB) {
                  recipient = getRecipientPubkeyFromGift(giftFromDB);
               }

               if (!recipient) {
                  throw new Error('fee set on gift, but no recipient');
               }

               /* lock the fee to recipient's pubkey */
               const { send: lockedFeeProofs } = await wallet.send(fee, feeProofs, {
                  keysetId: keysetId,
                  pubkey: '02' + recipient,
               });

               const feeToken = getEncodedTokenV4({
                  token: [{ proofs: lockedFeeProofs, mint: wallet.mint.mintUrl }],
                  unit: wallet.keys.unit,
               });

               /* send fee as a notification to Boardwalk */
               const txid = computeTxId(feeToken);
               await createTokenInDb({ token: feeToken, giftId: Number(giftId) }, txid, true);
               await notifyTokenReceived(recipient, JSON.stringify({ token: feeToken }), txid);
            }

            let created;
            let token: string | undefined;
            token = getEncodedTokenV4({
               token: [{ proofs: proofsToSendToUser, mint: wallet.mint.mintUrl }],
               unit: wallet.keys.unit,
            });
            /* not sure why gift is ending up as 'undefined' */
            if (giftId) {
               const txid = computeTxId(token);

               await createTokenInDb({ token, giftId: Number(giftId) }, txid);

               created = await notifyTokenReceived(pubkey, JSON.stringify({ token }), txid);
            } else {
               created = await createNotification(pubkey, NotificationType.TIP, token);
            }

            if (!created) {
               await updateUser(pubkey, { receiving: false });
               res.status(500).send({ success: false, message: 'Failed to create proofs.' });
               return;
            }

            await updateMintQuote(slug, { paid: true, token });

            await updateUser(pubkey, { receiving: false });

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
