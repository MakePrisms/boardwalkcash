import { AuthenticatedRequest, CheckPaymentRequestResponse, NotificationType } from '@/types';
import { getEncodedTokenV4, PaymentRequestPayload } from '@cashu/cashu-ts';
import { computeTxId, initializeWallet } from '@/utils/cashu';
import { createNotification } from '@/lib/notificationModels';
import { runAuthMiddleware } from '@/utils/middleware';
import { NextApiResponse } from 'next';
import {
   getPaymentRequestByIdIncludeToken,
   markPaymentRequestAsPaid,
   getPaymentRequestById,
   addTokenToPaymentRequest,
} from '@/lib/paymentRequestModels';

export default async function handler(
   req: AuthenticatedRequest,
   res: NextApiResponse<CheckPaymentRequestResponse | { error: string }>,
) {
   if (req.method === 'GET') {
      await runAuthMiddleware(req, res);

      const { id } = req.query;

      if (!id || typeof id !== 'string') {
         return res.status(400).json({ error: 'Invalid payment request ID' });
      }

      try {
         const paymentRequest = await getPaymentRequestByIdIncludeToken(id);

         if (!paymentRequest) {
            return res.status(404).json({ error: 'Payment request not found' });
         }

         if (paymentRequest.userPubkey !== req.authenticatedPubkey) {
            return res.status(403).json({ error: 'Unauthorized' });
         }

         let token: string | undefined;
         if (paymentRequest.reusable) {
            return res
               .status(400)
               .json({ error: 'Does not support checking reusable payment requests' });
         } else if (paymentRequest.tokens.length > 0) {
            token = paymentRequest.tokens[0].token;
         }

         return res.status(200).json({
            token,
            id: paymentRequest.id,
            paid: paymentRequest.paid,
            createdAt: paymentRequest.createdAt,
            updatedAt: paymentRequest.updatedAt,
         });
      } catch (error) {
         console.error('Error fetching payment request:', error);
         return res.status(500).json({ error: 'Internal server error' });
      }
   } else if (req.method === 'POST') {
      const payment = req.body as PaymentRequestPayload;
      console.log('payment', payment);
      console.log('proofs', payment.proofs);

      if (!payment.proofs) {
         return res.status(400).json({ error: 'Missing proofs' });
      }
      if (!payment.mint) {
         return res.status(400).json({ error: 'Missing mint' });
      }
      if (!payment.id) {
         return res.status(400).json({ error: 'Missing id' });
      }
      if (!payment.unit) {
         return res.status(400).json({ error: 'Missing amount' });
      }

      const request = await getPaymentRequestById(payment.id);

      if (!request) {
         return res.status(404).json({ error: 'Payment request not found' });
      }
      if (request.paid && !request.reusable) {
         return res.status(400).json({ error: 'Payment request already paid' });
      }

      let token: string;
      try {
         const wallet = await initializeWallet(payment.mint, { keysetId: payment.proofs[0].id });

         /* swap proofs for locked proofs */
         const lockedProofs = await wallet.receive(
            { token: [{ proofs: payment.proofs, mint: payment.mint }], unit: payment.unit },
            {
               pubkey: '02' + request.userPubkey,
            },
         );

         token = getEncodedTokenV4({
            token: [{ proofs: lockedProofs, mint: payment.mint }],
            unit: payment.unit,
         });
      } catch (e) {
         console.error('Failed to initialize wallet and swap for locked proofs', e);
         /* just use proofs in request as a fallback */
         token = getEncodedTokenV4({
            token: [{ proofs: payment.proofs, mint: payment.mint }],
            unit: payment.unit,
         });
      }

      const txid = computeTxId(token);
      if (request.reusable) {
         await addTokenToPaymentRequest(request.id, token);
      } else {
         await markPaymentRequestAsPaid(payment.id, token);
      }
      await createNotification(
         request.userPubkey,
         NotificationType.Token,
         JSON.stringify({ token }),
         txid,
      );
      return res.status(200).end();
   } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
