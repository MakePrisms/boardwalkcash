import { RootState, useAppDispatch } from '@/redux/store';
import { PayInvoiceResponse, PublicContact } from '@/types';
import { getAmountFromInvoice } from '@/utils/bolt11';
import { nwc } from '@getalby/sdk';
import { useSelector } from 'react-redux';
import { useExchangeRate } from '../util/useExchangeRate';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import { formatCents } from '@/utils/formatting';
import { addTransaction, TxStatus } from '@/redux/slices/HistorySlice';
import { getCallbackFromLightningAddress, getInvoiceFromLightningAddress } from '@/utils/lud16';
import {
   setReceiveModeAction,
   setSendModeAction,
   setUserLud16Action,
   setUserNWCAction,
} from '@/redux/slices/UserSlice';
import { authenticatedRequest, updateUser } from '@/utils/appApiRequests';
import { useToast } from '../util/useToast';
import { initializeUsdWallet, isTestMint } from '@/utils/cashu';
import { getEncodedTokenV4 } from '@cashu/cashu-ts';
import { useCashu } from '../cashu/useCashu';

const useMintlessMode = () => {
   const { nwcUri, pubkey, lud16, sendMode, receiveMode } = useSelector(
      (state: RootState) => state.user,
   );
   const { satsToUnit, unitToSats } = useExchangeRate();
   const { payInvoice: cashuPayInvoice } = useCashu();
   const dispatch = useAppDispatch();
   const { addToast } = useToast();

   const connect = async (nwcUri: string, lud16: string) => {
      try {
         const client = new nwc.NWCClient({
            nostrWalletConnectUrl: nwcUri,
         });
         const nwcInfo = await client.getInfo();
         const supportedMethods = nwcInfo.methods;
         if (!supportedMethods.includes('pay_invoice')) {
            throw new Error('NWC does not support pay_invoice');
         }
         const lud16Callback = await getCallbackFromLightningAddress(lud16);
         if (!lud16Callback) {
            throw new Error('Failed to fetch lightning address');
         }
         await updateUser(pubkey!, { lud16, mintlessReceive: true });
         dispatch(setUserNWCAction(nwcUri));
         dispatch(setUserLud16Action(lud16));
         dispatch(setSendModeAction('mintless'));
         dispatch(setReceiveModeAction('mintless'));
      } catch (error: any) {
         console.error('Error connecting to NWC:', error);
         const msg = error.message || 'Failed to connect to NWC';
         addToast(msg, 'error');
      }
   };

   const disconnect = async () => {
      await updateUser(pubkey!, { lud16: null, mintlessReceive: false });
      dispatch(setUserNWCAction(null));
      dispatch(setUserLud16Action(null));
      dispatch(setSendModeAction('default_mint'));
      dispatch(setReceiveModeAction('default_mint'));
   };

   const toggleSendMode = async () => {
      if (sendMode === 'mintless') {
         dispatch(setSendModeAction('default_mint'));
      } else {
         dispatch(setSendModeAction('mintless'));
      }
   };

   const toggleReceiveMode = async () => {
      if (receiveMode === 'mintless') {
         await updateUser(pubkey!, { mintlessReceive: false });
         dispatch(setReceiveModeAction('default_mint'));
      } else {
         await updateUser(pubkey!, { mintlessReceive: true });
         dispatch(setReceiveModeAction('mintless'));
      }
   };

   const initNwc = async () => {
      if (!nwcUri) throw new Error('No NWC URI found');

      const client = new nwc.NWCClient({
         nostrWalletConnectUrl: nwcUri,
      });

      return client;
   };

   const payInvoice = async (invoice: string): Promise<PayInvoiceResponse> => {
      const nwc = await initNwc();

      const res = await nwc.payInvoice({ invoice });

      const amountSats = getAmountFromInvoice(invoice);
      const amountUsdCents = await satsToUnit(amountSats, 'usd');

      dispatch(setSuccess(`Sent ${formatCents(amountUsdCents)}!`));
      dispatch(
         addTransaction({
            type: 'lightning',
            transaction: {
               amount: -amountUsdCents,
               unit: 'usd',
               date: new Date().toLocaleString(),
               status: TxStatus.PAID,
               mint: null,
               quote: null,
            },
         }),
      );

      return {
         preimage: res.preimage,
         amountUsd: amountUsdCents,
         feePaid: 0,
      };
   };

   const receiveLightningPayment = async (amountUsdCents: number) => {
      const amountUsd = Number((amountUsdCents / 100).toFixed(2));
      const amountSats = await unitToSats(amountUsd, 'usd');
      if (!lud16) {
         throw new Error('No lud16 found');
      }
      const amountMsats = amountSats * 1000;
      const invoice = await getInvoiceFromLightningAddress(lud16, amountMsats);
      return invoice;
   };

   const createToken = async (amountUsdCents: number, recipient: PublicContact, gift?: string) => {
      if (!recipient.defaultMintUrl) {
         addToast('Contact does not have a default mint', 'error');
         throw new Error('Contact does not have a default mint');
      }
      if (recipient.mintlessReceive) {
         addToast('Contact is in mintless receive mode', 'error');
         throw new Error('Contact is in mintless receive mode');
      }
      if (isTestMint(recipient.defaultMintUrl)) {
         addToast('Contact is using a test mint', 'error');
         throw new Error('Cannot send to test mints');
      }
      try {
         const usdWallet = await initializeUsdWallet(recipient.defaultMintUrl);
         const { quote, request } = await usdWallet.createMintQuote(amountUsdCents);
         const res = await payInvoice(request);
         if (!res) {
            throw new Error('Failed to pay invoice');
         }
         const { proofs } = await usdWallet.mintTokens(amountUsdCents, quote, {
            keysetId: usdWallet.keys.id,
            pubkey: '02' + recipient.pubkey,
         });
         const token = getEncodedTokenV4({
            token: [{ proofs, mint: recipient.defaultMintUrl }],
            unit: 'usd',
         });
         // dispatch(
         //    addTransaction({
         //       type: 'ecash',
         //       transaction: {
         //          token: token,
         //          amount: -amountUsdCents,
         //          unit: 'usd',
         //          mint: recipient.defaultMintUrl,
         //          status: TxStatus.PENDING,
         //          date: new Date().toLocaleString(),
         //          pubkey: '02' + recipient.pubkey,
         //          gift: gift,
         //       },
         //    }),
         // );
         return token;
      } catch (error: any) {
         console.error('Error creating token:', error);
         const msg = error.message || 'Failed to create token';
         addToast(msg, 'error');
      }
   };

   const sendToMintlessUser = async (
      amountUsdCents: number,
      contact: PublicContact,
      gift?: string,
   ) => {
      if (!contact.lud16) {
         throw new Error('Contact does not have a lightning address');
      }
      if (!contact.mintlessReceive) {
         throw new Error('Contact is not in mintless receive mode');
      }
      const amountUsd = Number((amountUsdCents / 100).toFixed(2));
      const amountSats = await unitToSats(amountUsd, 'usd');
      const invoice = await getInvoiceFromLightningAddress(contact.lud16, amountSats * 1000);
      let tx: PayInvoiceResponse | undefined;
      if (sendMode === 'mintless') {
         tx = await payInvoice(invoice);
      } else {
         tx = await cashuPayInvoice(invoice);
      }
      const res = await authenticatedRequest<undefined>(`/api/mintless/transaction`, 'POST', {
         gift,
         amount: amountUsdCents,
         recipientPubkey: contact.pubkey,
         createdByPubkey: pubkey!,
         isFee: false,
      });
   };

   return {
      nwcPayInvoice: payInvoice,
      mintlessReceive: receiveLightningPayment,
      createMintlessToken: createToken,
      sendToMintlessUser,
      toggleSendMode,
      toggleReceiveMode,
      connect,
      disconnect,
   };
};

export default useMintlessMode;
