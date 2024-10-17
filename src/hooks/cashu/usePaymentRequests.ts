import {
   CheckPaymentRequestResponse,
   GetPaymentRequestResponse,
   PayInvoiceResponse,
} from '@/types';
import { authenticatedRequest } from '@/utils/appApiRequests';
import {
   CashuWallet,
   decodePaymentRequest,
   PaymentRequest,
   PaymentRequestPayload,
   PaymentRequestTransport,
   PaymentRequestTransportType,
} from '@cashu/cashu-ts';
import { useCashu } from './useCashu';
import { useCashuContext } from '../contexts/cashuContext';
import { initializeWallet } from '@/utils/cashu';
import { sendNip04DM, sendNip17DM } from '@/utils/nostr';
import { useProofStorage } from './useProofStorage';

export const usePaymentRequests = () => {
   const { activeWallet, wallets } = useCashuContext();
   const { payInvoice: cashuPayInvoice, getProofsToSend } = useCashu();
   const { addProofs } = useProofStorage();

   const fetchPaymentRequest = async (amount?: number, reusable?: boolean) => {
      return await authenticatedRequest<GetPaymentRequestResponse>(
         `/api/token/pr?${amount ? `amount=${amount}&` : ''}${reusable ? 'reusable=true' : ''}`,
         'GET',
         undefined,
      );
   };
   const checkPaymentRequest = async (id: string) => {
      return await authenticatedRequest<CheckPaymentRequestResponse>(
         `/api/token/pr/${id}`,
         'GET',
         undefined,
      );
   };

   const createPayload = async (request: PaymentRequest): Promise<PaymentRequestPayload> => {
      if (!request.amount) {
         throw new Error('Missing amount');
      }
      const { mints, amount, unit } = request;

      const hasMints = mints && mints.length > 0;
      const hasOurActiveWallet =
         hasMints &&
         (unit === activeWallet?.keys.unit || unit === undefined) &&
         mints.find(url => url === activeWallet?.mint.mintUrl);

      let wallet: CashuWallet | undefined;
      if (!activeWallet && hasMints) {
         /* send from lightning wallet */
         // wallet = await initializeWallet(mints[0], { unit });
         throw new Error('lightning wallet not supported yet');
      } else if (hasOurActiveWallet && activeWallet) {
         /* send from same wallet (swap) */
         wallet = activeWallet;
      } else if (!hasMints && activeWallet) {
         /* no mint specified */
         wallet = activeWallet;
      } else if (hasMints) {
         /* make lightning payment */
         wallet = await initializeWallet(mints[0], { unit });
      } else {
         throw new Error('Failed to find a wallet that matches our conditions');
      }

      if (!wallet) {
         throw new Error('failed to initialize wallet');
      }

      console.log(wallet.keys.unit, activeWallet?.keys.unit);
      console.log(wallet.mint.mintUrl, activeWallet?.mint.mintUrl);

      if (
         wallet.keys.unit === activeWallet?.keys.unit &&
         wallet.mint.mintUrl === activeWallet?.mint.mintUrl
      ) {
         console.log('using active wallet and swapping');
         const proofs = await getProofsToSend(request.amount, wallet);
         return {
            proofs,
            mint: wallet.mint.mintUrl,
            id: request.id,
            unit: wallet.keys.unit,
         };
      } else {
         const quote = await wallet.createMintQuote(amount);

         let res: PayInvoiceResponse;
         if (activeWallet) {
            res = await cashuPayInvoice(quote.request);
         } else {
            throw new Error('lightning wallet not supported yet');
         }

         const { proofs } = await wallet.mintTokens(amount, quote.quote);
         return {
            proofs,
            mint: wallet.mint.mintUrl,
            id: request.id,
            unit: wallet.keys.unit,
         };
      }
   };

   const payPaymentRequest = async (pr: string, amount?: number) => {
      const request = decodePaymentRequest(pr);

      if (!request.amount && !amount) {
         throw new Error('Missing amount');
      } else if (!request.amount) {
         request.amount = amount;
      }

      if (request.getTransport(PaymentRequestTransportType.POST)) {
         const transport = request.getTransport(PaymentRequestTransportType.POST);
         return await handlePostTransport(request, transport);
      } else if (request.getTransport(PaymentRequestTransportType.NOSTR)) {
         const transport = request.getTransport(PaymentRequestTransportType.NOSTR);
         return await handleNostrTransport(request, transport);
      } else {
         throw new Error('unsupported transport method');
      }
   };

   const handlePostTransport = async (
      request: PaymentRequest,
      transport: PaymentRequestTransport,
   ) => {
      const url = transport.target;

      const payment = await createPayload(request);

      console.log('posting to', url);

      try {
         const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payment),
            headers: {
               'Content-Type': 'application/json',
            },
         });

         if (!response.ok) {
            throw new Error('Failed to send payment');
         } else {
            return true;
         }
      } catch (e) {
         addProofs(payment.proofs);
         throw e;
      }
   };
   const handleNostrTransport = async (
      request: PaymentRequest,
      transport: PaymentRequestTransport,
   ) => {
      const nprofile = transport.target;
      const supportsNip04 = request.getTag('1');
      const supportsNip17 = request.getTag('2');
      if (!supportsNip04 && !supportsNip17) {
         throw new Error('Nostr payments not supported');
      }

      const payment = await createPayload(request);

      try {
         if (supportsNip17) {
            await sendNip17DM(nprofile, JSON.stringify(payment));
         } else if (supportsNip04) {
            console.log('sending payment request to nostr');
            await sendNip04DM(nprofile, JSON.stringify(payment));
         }

         return true;
      } catch (e) {
         addProofs(payment.proofs);
         throw e;
      }
   };
   return { fetchPaymentRequest, checkPaymentRequest, payPaymentRequest };
};
