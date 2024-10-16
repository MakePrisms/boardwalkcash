import { createNotification } from '@/lib/notificationModels';
import {
   createPaymentRequest,
   getPayentRequestById,
   markPaymentRequestAsPaid,
} from '@/lib/paymentRequestModels';
import { findUserByPubkeyWithMint } from '@/lib/userModels';
import {
   AuthenticatedRequest,
   Currency,
   GetPaymentRequestResponse,
   NotificationType,
} from '@/types';
import { runAuthMiddleware } from '@/utils/middleware';
import { getBaseURLFromRequest } from '@/utils/url';
import {
   PaymentRequestTransportType,
   PaymentRequestTransport,
   PaymentRequestPayload,
   PaymentRequest,
   getEncodedTokenV4,
} from '@cashu/cashu-ts';
import { NextApiResponse, NextApiRequest } from 'next';

type GetPaymentRequestQuery = {
   amount: number;
};

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
   if (req.method === 'GET') {
      await runAuthMiddleware(req, res);
      const pubkey = req.authenticatedPubkey;
      const { amount } = req.query as unknown as GetPaymentRequestQuery;
      if (!pubkey || !amount) {
         return res.status(400).json({ error: 'Missing required parameters' });
      }
      if (isNaN(Number(amount))) {
         return res.status(400).json({ error: 'amount must be a number' });
      }
      if (typeof pubkey !== 'string') {
         return res.status(400).json({ error: 'pubkey must be a string' });
      }

      const user = await findUserByPubkeyWithMint(pubkey);

      if (!user) {
         return res.status(404).json({ error: 'User not found' });
      }

      const mint: string = user.defaultMint.url;
      const unit = user.defaultUnit as Currency;

      const httpTransport: PaymentRequestTransport = {
         type: PaymentRequestTransportType.POST,
         target: `${getBaseURLFromRequest(req)}/api/token/pr`,
      };

      const { id } = await createPaymentRequest({
         user: {
            connect: {
               pubkey,
            },
         },
         reusable: false,
      });

      const paymentRequest = new PaymentRequest(
         [httpTransport],
         id,
         amount,
         unit,
         [mint],
         undefined,
      );

      const encoded = paymentRequest.toEncodedRequest();
      console.log('encoded', encoded);
      res.status(200).json({ pr: encoded, id } as GetPaymentRequestResponse);
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

      const request = await getPayentRequestById(payment.id);

      if (!request) {
         return res.status(404).json({ error: 'Payment request not found' });
      }
      if (request.paid) {
         return res.status(400).json({ error: 'Payment request already paid' });
      }
      const token = getEncodedTokenV4({
         token: [{ proofs: payment.proofs, mint: payment.mint }],
         unit: payment.unit,
      });
      const updatedPayment = await markPaymentRequestAsPaid(payment.id, token);
      if (!updatedPayment.txid) {
         console.error('Failed to mark payment request as paid');
      } else {
         await createNotification(
            request.userPubkey,
            NotificationType.Token,
            JSON.stringify({ token }),
            updatedPayment.txid,
         );
      }
      return res.status(200).end();
   } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}

// payment request has the Y
// create blinded messages
