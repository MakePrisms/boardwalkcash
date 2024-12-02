import { RootState, useAppDispatch } from '@/redux/store';
import { Currency, PayInvoiceResponse, PublicContact } from '@/types';
import { nwc, Nip47Error } from '@getalby/sdk';
import { decodeBolt11 } from '@/utils/bolt11';
import { useSelector } from 'react-redux';
import { useExchangeRate } from '../util/useExchangeRate';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import { formatSats } from '@/utils/formatting';
import { addTransaction, MintlessTransaction, TxStatus } from '@/redux/slices/HistorySlice';
import { getCallbackFromLightningAddress, getInvoiceFromLightningAddress } from '@/utils/lud16';
import {
   setReceiveModeAction,
   setSendModeAction,
   setUserLud16Action,
   setUserNWCAction,
} from '@/redux/slices/UserSlice';
import { authenticatedRequest, updateUser } from '@/utils/appApiRequests';
import { useToast } from '../util/useToast';
import { dissectToken, initializeWallet, isTestMint } from '@/utils/cashu';
import {
   CashuWallet,
   getDecodedToken,
   getEncodedTokenV4,
   MeltQuoteResponse,
   Token,
} from '@cashu/cashu-ts';
import { useCashu } from '../cashu/useCashu';
import { useProofStorage } from '../cashu/useProofStorage';
import { useCashuContext } from '../contexts/cashuContext';
import { getMsgFromUnknownError } from '@/utils/error';

const useMintlessMode = () => {
   const { nwcUri, pubkey, lud16, sendMode, receiveMode } = useSelector(
      (state: RootState) => state.user,
   );
   const { satsToUnit, convertToUnit } = useExchangeRate();
   const { payInvoice: cashuPayInvoice, unlockProofs } = useCashu();
   const { activeUnit } = useCashuContext();
   const { addProofs } = useProofStorage();
   const dispatch = useAppDispatch();
   const { addToast } = useToast();
   const user = useSelector((state: RootState) => state.user);

   const handleNwcError = (error: Nip47Error) => {
      if (error.code === 'UNAUTHORIZED') {
        addToast('Unauthorized NWC connection. Please check your credentials.', 'error');
      } else if (error.code === 'QUOTA_EXCEEDED') {
        addToast('NWC budget exceeded. Please increase your budget or try again later.', 'error');
      } else if (error.code === 'RATE_LIMITED') {
         addToast('The client is sending commands too fast. It should retry in a few seconds.', 'error');
      } else if (error.code === 'NOT_IMPLEMENTED') {
         addToast('The command is not known or is intentionally not implemented.', 'error');
      } else if (error.code === 'INSUFFICIENT_BALANCE') {
         addToast('The wallet does not have enough funds to cover a fee reserve or the payment amount.', 'error');
      } else if (error.code === 'RESTRICTED') {
         addToast('This public key is not allowed to do this operation.', 'error');
      } else if (error.code === 'INTERNAL') {
         addToast(`Internal NWC error: ${error.message}`, 'error');
      } else {
         addToast(`NWC error: ${error.message}`, 'error');
      }
   };

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
      try {
         if (!nwcUri) throw new Error('No NWC URI found');

         const client = new nwc.NWCClient({
            nostrWalletConnectUrl: nwcUri,
         });

         return client;
      } catch (error: any) {
         handleNwcError(error);
         throw error;
      }
   };

   const getNwcBalance = async () => {
      try {
         const nwc = await initNwc();
         const { balance: balanceMsat } = await nwc.getBalance();
         return balanceMsat / 1000;
      } catch (error: any) {
         handleNwcError(error);
      }
   };

   const payInvoice = async (invoice: string): Promise<PayInvoiceResponse> => {
      try {
         const nwc = await initNwc();

         const res = await nwc.payInvoice({ invoice });


      const { amountSat } = decodeBolt11(invoice);

      if (!amountSat) {
         throw new Error('Amountless invoices are not supported');
      }

      dispatch(setSuccess(`Sent ${formatSats(amountSat)}!`));
      dispatch(
         addTransaction({
            type: 'mintless',
            transaction: {
               amount: -amountSat,
               unit: Currency.SAT,
               type: 'mintless',
               transaction: {
                  amount: -amountSats,
                  unit: Currency.SAT,
                  type: 'mintless',
                  gift: null,
                  date: new Date().toLocaleString(),
               } as MintlessTransaction,
            }),
         );

         return {
            preimage: res.preimage,
            amountUsd: amountSats,
            feePaid: 0,
         };
      } catch (error: any) {
         handleNwcError(error);
      }
   };

   // TODO: get payment status from lightning wallet
   const receiveLightningPayment = async (amountSats: number) => {
      try {
         if (!lud16) {
            throw new Error('No lud16 found');
         }
         const amountMsats = amountSats * 1000;
         const invoice = await getInvoiceFromLightningAddress(lud16, amountMsats);
         return invoice;
      } catch (error: any) {
         handleNwcError(error);
      }
   };

   const createToken = async (
      amountUnit: number,
      unit: Currency,
      recipient: PublicContact,
      gift?: string,
   ) => {
      if (!recipient.defaultMintUrl) {
         addToast('Contact does not have a default mint', 'error');
         throw new Error('Contact does not have a default mint');
      }
      if (recipient.mintlessReceive) {
         addToast('Contact is in Lightning wallet mode', 'error');
         throw new Error('Contact is in mintless receive mode');
      }
      if (isTestMint(recipient.defaultMintUrl)) {
         addToast('Contact is using a test mint', 'error');
         throw new Error('Cannot send to test mints');
      }
      try {
         console.log('creating mintless token', recipient.defaultUnit);
         const wallet = await initializeWallet(recipient.defaultMintUrl, {
            unit: recipient.defaultUnit,
         });
         let amount: number;
         if (unit !== recipient.defaultUnit) {
            amount = await convertToUnit(amountUnit, unit, recipient.defaultUnit);
         } else {
            amount = amountUnit;
         }
         const { quote, request } = await wallet.createMintQuote(amount);
         const res = await payInvoice(request);
         if (!res) {
            throw new Error('Failed to pay invoice');
         }
         const { proofs } = await wallet.mintTokens(amount, quote, {
            keysetId: wallet.keys.id,
            pubkey: '02' + recipient.pubkey,
         });
         const token = getEncodedTokenV4({
            token: [{ proofs, mint: recipient.defaultMintUrl }],
            unit: wallet.keys.unit,
         });
         return token;
      } catch (error: any) {
         console.error('Error creating token:', error);
         const msg = error.message || 'Failed to create token';
         addToast(msg, 'error');
      }
   };

   const sendToMintlessUser = async (
      amountUnit: number,
      unit: Currency,
      contact: PublicContact,
      gift?: string,
   ) => {
      console.log('sendToMintlessUser');
      if (!contact.lud16) {
         throw new Error('Contact does not have a lightning address');
      }
      if (!contact.mintlessReceive) {
         throw new Error('Contact is not in mintless receive mode');
      }
      try {
         const amountSats = await convertToUnit(amountUnit, unit, 'sat');
         const invoice = await getInvoiceFromLightningAddress(contact.lud16, amountSats * 1000);
         let tx: PayInvoiceResponse | undefined;
         if (sendMode === 'mintless') {
            tx = await payInvoice(invoice);
         } else {
            console.log('paying invoice with cashu', invoice);
            tx = await cashuPayInvoice(invoice);
            dispatch(
               addTransaction({
                  type: 'ecash',
                  transaction: {
                     amount: amountSats,
                     date: new Date().toLocaleString(),
                     status: TxStatus.PAID,
                     mint: null,
                     quote: null,
                     unit: 'sat',
                     memo: undefined,
                     appName: undefined,
                     pubkey: undefined,
                  },
               }),
            );
         }
         if (!pubkey) {
            throw new Error('Bug: pubkey is null');
         }
         await authenticatedRequest<undefined>(`/api/mintless/transaction`, 'POST', {
            gift,
            amount: amountSats,
            recipientPubkey: contact.pubkey,
            createdByPubkey: pubkey,
            isFee: false,
         });
         addToast(
            `Sent ${formatSats(amountSats)} to ${contact.username || contact.lud16}`,
            'success',
         );
      } catch (e) {
         addToast(getMsgFromUnknownError(e), 'error');
      }
   };

   const handleMintlessClaim = async (token: Token | string) => {
      const { mintUrl, unit, pubkeyLock } = dissectToken(token);
      const wallet = await initializeWallet(mintUrl, { unit });
      const privkey = pubkeyLock ? user.privkey : undefined;

      token = typeof token === 'string' ? getDecodedToken(token) : token;

      try {
         const { amountMeltedSat } = await mintlessClaimToken(wallet, token, {
            privkey,
         });
         if (!amountMeltedSat) throw new Error('Failed to claim token');
         addToast(`Claimed ${formatSats(amountMeltedSat)} to Lightning Wallet`, 'success');
         return true;
      } catch (error: any) {
         console.error('Error claiming token:', error);
         const msg = error.message || 'Failed to claim token';
         addToast(msg, 'error');
         return false;
      }
   };

   const mintlessClaimToken = async (
      wallet: CashuWallet,
      token: Token,
      opts?: { privkey?: string },
   ) => {
      const totalProofAmount = token.token[0].proofs.reduce((a, b) => a + b.amount, 0);
      let amountToMelt = totalProofAmount;
      const maxAttempts = 5;
      let attempts = 0;
      let meltQuote: MeltQuoteResponse | null = null;
      let invoice: string;

      while (attempts < maxAttempts) {
         attempts++;
         console.log(`Attempt ${attempts} to find valid melt quote`);

         if (amountToMelt < 1) {
            throw new Error('Amount to claim is too small for a lightning payment.');
         }

         const amountSats = await convertToUnit(amountToMelt, token.unit as string, 'sat');
         invoice = await receiveLightningPayment(amountSats);

         meltQuote = await wallet.createMeltQuote(invoice);

         if (meltQuote.amount + meltQuote.fee_reserve <= totalProofAmount) {
            console.log('Found valid melt quote');
            break;
         }

         const difference = meltQuote.amount + meltQuote.fee_reserve - totalProofAmount;
         amountToMelt = amountToMelt - difference;
      }
      if (attempts >= maxAttempts) {
         throw new Error('Failed to find valid melt quote after maximum attempts.');
      }

      if (!meltQuote) {
         throw new Error('Failed to find valid melt quote');
      }

      const swapToUnlock = opts?.privkey ? true : false;

      const proofs = swapToUnlock
         ? await unlockProofs(wallet, token.token[0].proofs)
         : token.token[0].proofs;

      const { change, isPaid, preimage } = await wallet.meltTokens(meltQuote, proofs).catch(e => {
         if (swapToUnlock) {
            /* only adding because I'm assuming these are proofs being claimed */
            addProofs(proofs || []);
            alert(
               `Lightning payment from ${wallet.mint.mintUrl} to ${lud16} failed. In order to get your funds back, you will need to add ${wallet.mint.mintUrl} to your wallet. Go to settings -> "Mints" -> "Add a Mint" and add ${wallet.mint.mintUrl} to your wallet.`,
            );
            throw new Error(`Lightning payment from ${wallet.mint.mintUrl} to ${lud16} failed`);
         } else {
            throw e;
         }
      });

      if (!isPaid) {
         throw new Error('Melt failed');
      }

      if (change) {
         await addProofs(change);
      }

      const amountSat = await convertToUnit(amountToMelt, token.unit as string, 'sat');

      dispatch(
         addTransaction({
            type: 'mintless',
            transaction: {
               amount: amountToMelt,
               unit: token.unit as Currency,
               gift: null,
               type: 'mintless',
               date: new Date().toLocaleString(),
            } as MintlessTransaction,
         }),
      );

      return {
         preimage,
         amountMelted: amountToMelt,
         amountMeltedSat: amountSat,
      };
   };

   return {
      nwcPayInvoice: payInvoice,
      mintlessReceive: receiveLightningPayment,
      createMintlessToken: createToken,
      mintlessClaimToken,
      getNwcBalance,
      sendToMintlessUser,
      handleMintlessClaim,
      toggleSendMode,
      toggleReceiveMode,
      connect,
      disconnect,
      isMintless: user.receiveMode === 'mintless' || user.sendMode === 'mintless',
   };
};

export default useMintlessMode;
