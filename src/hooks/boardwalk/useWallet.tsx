import { usePendingTransaction } from '../cashu/usePendingTransaction';
import { Currency, GiftAsset, MintQuoteStateExt, PublicContact } from '@/types';
import { useProofStorage } from '../cashu/useProofStorage';
import { useCashuContext } from '../contexts/cashuContext';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import { postTokenToDb } from '@/utils/appApiRequests';
import useNotifications from './useNotifications';
import { MintQuoteState } from '@cashu/cashu-ts';
import { formatUnit } from '@/utils/formatting';
import useMintlessMode from './useMintlessMode';
import { isMintQuoteExpired } from '@/utils/cashu';
import { useAppDispatch } from '@/redux/store';
import { useCashu } from '../cashu/useCashu';
import { useToast } from '../util/useToast';
import { useCallback } from 'react';
import {
   addPendingLightningTransaction,
   deleteLightningTransaction,
   TxStatus,
   updateTransactionStatus,
} from '@/redux/slices/HistorySlice';

const useWallet = () => {
   const { isMintless, createMintlessToken, sendToMintlessUser, mintlessReceive } =
      useMintlessMode();
   const { sendTokenAsNotification } = useNotifications();
   const { createSendableToken } = useCashu();
   const { activeUnit, activeWallet, getWallet } = useCashuContext();
   const { addPendingMintQuote, pendingMintQuotes, removePendingMintQuote } =
      usePendingTransaction();
   const { addProofs } = useProofStorage();
   const { addToast } = useToast();

   const dispatch = useAppDispatch();

   /**
    * Send ecash or make a mintless transaction
    * @param amount Amount of the unit to send
    * @param unit Unit to send
    * @param onSendToMintlessUser Callback that should reset the parent component's state because sending to a mintless user just returns void
    * @param gift Optional gift to send with the ecash
    * @param contact Contact to lock the ecash too and send a notification to
    * @returns If succesfful and not sending to a mintless user it returns sent data, otherwise undefined (including on error)
    */
   const sendEcash = async (
      amount: number,
      unit: Currency,
      onSendToMintlessUser: () => void,
      gift?: GiftAsset,
      contact?: PublicContact,
   ): Promise<
      | {
           token: string;
           txid: string | undefined;
           gift: GiftAsset | undefined;
        }
      | undefined
   > => {
      let token: string | undefined;
      try {
         if (isMintless && !contact?.mintlessReceive) {
            /* if we are making a lightning payment to a user with a mint */
            if (!contact) {
               addToast('You can only send eTips and eGifts from a Lightning Wallet.', 'error');
               throw new Error('You can only send eTips and eGifts from a Lightning Wallet.');
            }
            if (unit !== 'sat') {
               throw new Error('mintless only supports sat');
            }

            token = await createMintlessToken(Math.round(amount), unit, contact);
         } else if (contact?.mintlessReceive) {
            /* user wants to receive to their lud16 */
            if (!contact.lud16) {
               addToast('Contact does not have a lightning address', 'error');
               return;
            }

            await sendToMintlessUser(amount, activeUnit, contact);
            onSendToMintlessUser();
         } else {
            /* regular send */
            console.log('creating token for ', amount);
            token = await createSendableToken(amount, {
               pubkey: contact ? `02${contact.pubkey}` : undefined,
               gift: gift?.name,
               feeCents: gift?.fee,
            });
         }

         if (!token) {
            throw new Error('Failed to create ecash token');
         }

         let txid: string | undefined;
         if (contact) {
            await sendTokenAsNotification(token);
            txid = await postTokenToDb(token);
         }

         return { token, txid, gift };
      } catch (e) {
         if (e instanceof Error) {
            addToast(e.message, 'error');
         } else {
            addToast('Failed to send token', 'error');
         }
         console.error(e);
      }
   };

   /**
    * Send a gift as ecash or to a mintless user
    * @param gift [`GiftAsset`] to send
    * @param onSendToMintlessUser Called when sending to a mintless user. Should reset the parent component's state
    * @param contact Optional contact to send the gift to
    * @returns If succesfful and not sending to a mintless user it returns sent data, otherwise undefined (including on error)
    */
   const sendGift = async (
      gift: GiftAsset,
      onSendToMintlessUser: () => void,
      contact?: PublicContact,
   ): Promise<{ txid?: string; token?: string } | undefined> => {
      try {
         if (gift?.campaingId) {
            throw new Error('Gift campaigns not implemented');
            // if (!selectedContact) throw new Error('No contact selected');
            // const { token } = await sendCampaignGift(gift, selectedContact?.pubkey).catch(e => {
            //    const errMsg = e.message || 'Failed to send eGift';
            //    addToast(errMsg, 'error');
            //    setSending(false);
            //    return { token: null };
            // });
            // if (token) {
            //    addToast(`eGift sent to ${selectedContact?.username}`, 'success');
            //    setToken(token);
            //    setCurrentStep(GiftStep.ShareGift);
            // }
            // setSending(false);
            // return;
         }
         // else if (useInvoice) {
         //    handleLightningTip(amountUnit, gift?.fee);
         //    return;
         // }
         let sendableToken: string | undefined;
         if (isMintless && !contact?.mintlessReceive) {
            if (!contact) {
               throw new Error('No contact selected');
            }

            sendableToken = await createMintlessToken(gift.amount, activeUnit, contact, gift?.name);
         } else if (contact?.mintlessReceive) {
            await sendToMintlessUser(gift.amount, activeUnit, contact, gift?.name);

            addToast(`eGift sent`, 'success');
            onSendToMintlessUser();
            return undefined;
         } else {
            sendableToken = await createSendableToken(gift.amount, {
               pubkey: contact ? `02${contact.pubkey}` : undefined,
               gift: gift?.name,
               feeCents: gift?.fee,
            });
         }

         if (!sendableToken) {
            /* this error case is handled in useCashu */
            return;
         }

         let txid: string | undefined;
         if (contact) {
            txid = await postTokenToDb(sendableToken, gift?.name);
            await sendTokenAsNotification(sendableToken, txid);
         }

         addToast(
            `eGift sent (${formatUnit(gift.amount + (gift?.fee || 0), activeUnit)})`,
            'success',
         );
         return { txid, token: sendableToken };
      } catch (error: any) {
         console.error('Error sending token:', error);
         const msg = error.message || 'Failed to send token';
         addToast(msg, 'error');
      }
   };

   /** Generate an invoice from mintless wallet or active cashu wallet */
   const generateInvoice = useCallback(
      async (amount: number): Promise<{ invoice: string; checkingId: string }> => {
         let result: { invoice: string; checkingId: string };
         if (isMintless) {
            /* TODO: need some way to check status of invoice */
            result = {
               invoice: await mintlessReceive(amount),
               checkingId: '',
            };
         } else {
            if (!activeWallet) {
               throw new Error('Active wallet not set and mintless receive is not enabled');
            }
            const quote = await activeWallet.createMintQuote(amount);
            result = {
               invoice: quote.request,
               checkingId: quote.quote,
            };

            /* save mint quote until we claim proofs */
            addPendingMintQuote({ ...quote, amount, keysetId: activeWallet.keys.id });
            dispatch(
               addPendingLightningTransaction({
                  transaction: {
                     amount,
                     quote: quote.quote,
                     unit: activeUnit,
                     mint: activeWallet.mint.mintUrl,
                  },
               }),
            );
         }
         return result;
      },
      [isMintless, activeWallet, mintlessReceive, addPendingMintQuote, dispatch, activeUnit],
   );

   /** Tries to mint proofs for a pending mint quote*/
   const tryToMintProofs = useCallback(
      async (quoteId: string): Promise<MintQuoteStateExt> => {
         const pendingQuote = pendingMintQuotes.find(q => q.quote === quoteId);
         if (!pendingQuote) {
            throw new Error('No pending mint quote found');
         }

         /* get wallet with matching keyset id */
         const wallet = getWallet(pendingQuote.keysetId);
         if (!wallet) {
            // TODO: how can we make sure we always can get a wallet instance?
            throw new Error('Wallet not found for pending quote');
         }

         const { state } = await wallet.checkMintQuote(pendingQuote.quote);

         if (state === MintQuoteState.UNPAID) {
            /* invoice not paid */
            if (isMintQuoteExpired(pendingQuote)) {
               /* only check expired if its UNPAID */
               dispatch(deleteLightningTransaction(quoteId));

               return 'EXPIRED';
            } else {
               return state;
            }
         } else if (state === MintQuoteState.ISSUED) {
            /* this shouldn't happen if we successfully remove the quote after minting */
            console.warn('Mint quote already issued');
            removePendingMintQuote(quoteId);
            return state;
         } else if (state === MintQuoteState.PAID) {
            /* invoice was paid, mint proofs */
            const { proofs } = await wallet.mintTokens(pendingQuote.amount, quoteId);
            /* claim new proofs */
            await addProofs(proofs);

            removePendingMintQuote(quoteId);

            dispatch(setSuccess(`Received ${formatUnit(pendingQuote.amount, activeUnit)}`));
            dispatch(
               updateTransactionStatus({
                  type: 'lightning',
                  quote: quoteId,
                  status: TxStatus.PAID,
               }),
            );

            /* quote is now ISSUED */
            return MintQuoteState.ISSUED;
         } else {
            throw new Error('Invalid mint quote state');
         }
      },
      [pendingMintQuotes, activeUnit, removePendingMintQuote, addProofs, getWallet, dispatch],
   );
   return {
      sendGift,
      sendEcash,
      generateInvoice,
      tryToMintProofs,
   };
};

export default useWallet;
