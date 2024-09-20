import { NextApiResponse } from 'next';
import {
   AuthenticatedRequest,
   PostSendGiftResponse,
   PostSingleGiftCampaignSendRequest,
} from '@/types';
import { runAuthMiddleware } from '@/utils/middleware';
import {
   addUserToClaimedCampaignGifts,
   getSingleGiftCampaign,
   setCampaignInactive,
} from '@/lib/campaignModels';
import { findUserByPubkey, getUserClaimedCampaignGifts } from '@/lib/userModels';
import { nwc } from '@getalby/sdk';
import { computeTxId, initializeUsdWallet } from '@/utils/cashu';
import { getEncodedTokenV4, MintQuoteState } from '@cashu/cashu-ts';
import { createTokenInDb } from '@/lib/tokenModels';
import { notifyTokenReceived } from '@/lib/notificationModels';
import { setGiftStatus } from '@/lib/gifts';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse<any>) {
   if (req.method === 'POST') {
      try {
         await runAuthMiddleware(req, res);

         /* shouldn't happen, but make ts happy */
         if (!req.authenticatedPubkey) {
            return res.status(401).json({ message: 'Unauthorized' });
         }

         const user = await findUserByPubkey(req.authenticatedPubkey);

         if (!user) {
            return res.status(404).json({ message: 'User not found' });
         }

         if (!user.nostrPubkey) {
            return res
               .status(400)
               .json({ message: 'Connect your nostr account in settings -> profile -> discover' });
         }

         const { campaignId: id, recipientPubkey } = req.body as PostSingleGiftCampaignSendRequest;

         if (!id || typeof id !== 'number') {
            return res.status(400).json({ message: 'Invalid id' });
         }

         const campaign = await getSingleGiftCampaign(id);

         if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
         }

         if (campaign.claimedBy.length >= campaign.totalGifts) {
            await setCampaignInactive(id);
            await setGiftStatus(campaign.giftId, false);
            return res.status(400).json({ message: 'Too late! This campaign has ended.' });
         }

         const userClaimedGiftIds = await getUserClaimedCampaignGifts(req.authenticatedPubkey);

         if (userClaimedGiftIds.some(id => id === campaign.giftId)) {
            return res.status(400).json({ message: 'You have already claimed this campaign.' });
         }

         const receivingUser = await findUserByPubkey(recipientPubkey);

         if (!receivingUser) {
            return res.status(404).json({ message: 'User not found' });
         }

         const wallet = await initializeUsdWallet(receivingUser.defaultMintUrl);

         const { request: invoice, quote } = await wallet.createMintQuote(campaign.gift.amount);

         const payInvoiceRes = await new nwc.NWCClient({
            nostrWalletConnectUrl: campaign.nwcUri,
         }).payInvoice({ invoice });

         console.log('payInvoiceRes', payInvoiceRes);

         let token: string | undefined;
         for (let i = 0; i < 3; i++) {
            /* check mint quote, then mint tokens */
            try {
               const { state } = await wallet.checkMintQuote(quote);
               const isPaid = state === MintQuoteState.PAID;
               console.log('isPaid', isPaid);
               if (isPaid) {
                  const { proofs } = await wallet.mintTokens(campaign.gift.amount, quote, {
                     keysetId: wallet.keys.id,
                     pubkey: '02' + recipientPubkey,
                  });
                  token = getEncodedTokenV4({ token: [{ proofs, mint: wallet.mint.mintUrl }] });
                  break;
               }
            } catch (e) {
               console.error('Error checking or minting invoice:', e);
               if (i === 2) {
                  throw new Error('Failed to mint tokens after 3 attempts');
               }
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second timeout
         }
         if (!token) {
            return res.status(500).json({ message: 'Failed to mint tokens' });
         }

         const txid = computeTxId(token);

         try {
            await createTokenInDb({ token, gift: campaign.gift.name }, txid);
         } catch (error) {
            console.error('Error creating token in DB:', error);
            return res.status(500).json({ message: 'Failed to create token in database' });
         }

         try {
            await notifyTokenReceived(
               recipientPubkey,
               JSON.stringify({ token, from: req.authenticatedPubkey }),
               txid,
            );
         } catch (error) {
            console.error('Error notifying token received:', error);
            return res.status(500).json({ message: 'Failed to notify token received' });
         }

         const isFull = campaign.claimedBy.length + 1 === campaign.totalGifts;
         await addUserToClaimedCampaignGifts(id, req.authenticatedPubkey, !isFull);
         if (isFull) {
            await setGiftStatus(campaign.giftId, false);
         }

         await res.status(200).json({ txid, token } as PostSendGiftResponse);
      } catch (error) {
         console.error('Unexpected error:', error);
         res.status(500).json({ message: 'An unexpected error occurred' });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
