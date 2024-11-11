import { Currency, GiftAsset, PublicContact } from '@/types';
import { useCashuContext } from '../contexts/cashuContext';
import { postTokenToDb } from '@/utils/appApiRequests';
import useNotifications from './useNotifications';
import { formatUnit } from '@/utils/formatting';
import useMintlessMode from './useMintlessMode';
import { useCashu } from '../cashu/useCashu';
import { useToast } from '../util/useToast';

const useWallet = () => {
   const { isMintless, createMintlessToken, sendToMintlessUser } = useMintlessMode();
   const { sendTokenAsNotification } = useNotifications();
   const { createSendableToken } = useCashu();
   const { activeUnit } = useCashuContext();
   const { addToast } = useToast();

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
      } catch (e: any) {
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
   return {
      sendGift,
      sendEcash,
   };
};

export default useWallet;
