import {
   CheckPaymentRequestResponse,
   GetPaymentRequestResponse,
   PayInvoiceResponse,
} from '@/types';
import { authenticatedRequest } from '@/utils/appApiRequests';
import {
   CashuWallet,
   decodePaymentRequest,
   getDecodedToken,
   PaymentRequest,
   PaymentRequestPayload,
   PaymentRequestTransport,
   PaymentRequestTransportType,
} from '@cashu/cashu-ts';
import { useCashu } from './useCashu';
import { useCashuContext } from '../contexts/cashuContext';
import { initializeWallet } from '@/utils/cashu';
import { sendNip04DM } from '@/utils/nostr';

export const usePaymentRequests = () => {
   const { activeWallet, wallets } = useCashuContext();
   const { payInvoice: cashuPayInvoice, createSendableToken } = useCashu();

   const fetchPaymentRequest = async (amount: number) => {
      return await authenticatedRequest<GetPaymentRequestResponse>(
         `/api/token/pr?amount=${amount}`,
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

      let wallet: CashuWallet | undefined;
      if (!activeWallet && mints && mints.length > 0) {
         // wallet = await initializeWallet(mints[0], { unit });
         throw new Error('lightning wallet not supported yet');
      } else if ((!mints || mints.length === 0) && activeWallet) {
         wallet = activeWallet;
      } else if (mints && mints.length > 0) {
         wallet = await initializeWallet(mints[0], { unit });
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
         const token = await createSendableToken(amount);
         if (!token) {
            throw new Error('Failed to create token');
         }
         const proofs = getDecodedToken(token).token[0].proofs;
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
   };
   const handleNostrTransport = async (
      request: PaymentRequest,
      transport: PaymentRequestTransport,
   ) => {
      const nprofile = transport.target;
      const supportsNip04 = request.getTag('1');
      if (!supportsNip04) {
         throw new Error('Nostr payments not supported');
      }

      const payment = await createPayload(request);

      await sendNip04DM(nprofile, JSON.stringify(payment));

      console.log('sending payment request to nostr');

      return true;
   };
   return { fetchPaymentRequest, checkPaymentRequest, payPaymentRequest };
};
