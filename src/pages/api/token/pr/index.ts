import { createNotification } from '@/lib/notificationModels';
import {
   createPaymentRequest,
   getPayentRequestById,
   markPaymentRequestAsPaid,
} from '@/lib/paymentRequestModels';
import { createTokenInDb } from '@/lib/tokenModels';
import { findUserByPubkeyWithMint } from '@/lib/userModels';
import {
   AuthenticatedRequest,
   Currency,
   GetPaymentRequestResponse,
   NotificationType,
} from '@/types';
import { computeTxId, initializeWallet } from '@/utils/cashu';
import { corsMiddleware, runAuthMiddleware, runMiddleware } from '@/utils/middleware';
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
   amount?: number;
   reusable?: boolean;
};

export default async function handler(
   req: AuthenticatedRequest | NextApiRequest,
   res: NextApiResponse,
) {
   await runMiddleware(req, res, corsMiddleware);

   // Handle OPTIONS request
   if (req.method === 'OPTIONS') {
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(200).end();
   }

   if (req.method === 'GET') {
      await runAuthMiddleware(req as AuthenticatedRequest, res);
      const pubkey = (req as AuthenticatedRequest).authenticatedPubkey;
      const { amount, reusable } = req.query as unknown as GetPaymentRequestQuery;
      if (!pubkey) {
         return res.status(400).json({ error: 'Missing required parameters' });
      }
      if (amount && isNaN(Number(amount))) {
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
         amount: amount ? Number(amount) : undefined,
         reusable: reusable ? true : false,
      });

      const paymentRequest = new PaymentRequest(
         [httpTransport],
         id,
         amount ? Number(amount) : undefined,
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
         /* just use proofs in request */
         token = getEncodedTokenV4({
            token: [{ proofs: payment.proofs, mint: payment.mint }],
            unit: payment.unit,
         });
      }

      if (request.reusable) {
         const txid = computeTxId(token);
         await createTokenInDb({ token }, txid);
         await createNotification(
            request.userPubkey,
            NotificationType.Token,
            JSON.stringify({ token }),
            txid,
         );
      } else {
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
      }
      return res.status(200).end();
   } else {
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
