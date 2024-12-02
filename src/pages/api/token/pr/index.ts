import { corsMiddleware, runAuthMiddleware, runMiddleware } from '@/utils/middleware';
import { AuthenticatedRequest, Currency, GetPaymentRequestResponse } from '@/types';
import { createPaymentRequest } from '@/lib/paymentRequestModels';
import { findUserByPubkeyWithMint } from '@/lib/userModels';
import { getBaseURLFromRequest } from '@/utils/url';
import {
   PaymentRequestTransportType,
   PaymentRequestTransport,
   PaymentRequest,
} from '@cashu/cashu-ts';
import { NextApiResponse, NextApiRequest } from 'next';

export default async function handler(
   req: AuthenticatedRequest | NextApiRequest,
   res: NextApiResponse<GetPaymentRequestResponse | { error: string }>,
) {
   await runMiddleware(req, res, corsMiddleware);

   if (req.method === 'POST') {
      await runAuthMiddleware(req as AuthenticatedRequest, res);

      const pubkey = (req as AuthenticatedRequest).authenticatedPubkey!;
      const { amount, reusable } = req.query;

      if (!pubkey) {
         return res.status(400).json({ error: 'Missing required parameters' });
      }
      if (amount && isNaN(Number(amount))) {
         return res.status(400).json({ error: 'amount must be a number' });
      }

      const user = await findUserByPubkeyWithMint(pubkey);

      if (!user) {
         return res.status(404).json({ error: 'User not found' });
      }

      const mint = user.defaultMint.url;
      const unit = user.defaultUnit as Currency;

      const { id } = await createPaymentRequest({
         user: {
            connect: {
               pubkey,
            },
         },
         amount: amount ? Number(amount) : undefined,
         reusable: reusable ? true : false,
      });

      const httpTransport: PaymentRequestTransport = {
         type: PaymentRequestTransportType.POST,
         target: `${getBaseURLFromRequest(req)}/api/token/pr/${id}`,
      };

      // TODO: current cashu-ts version does not suppport creating reusable payment requests, but then we need to update to cashu-ts v2
      const paymentRequest = new PaymentRequest(
         [httpTransport],
         id,
         amount ? Number(amount) : undefined,
         unit,
         [mint],
         undefined,
      );

      const encoded = paymentRequest.toEncodedRequest();
      res.status(200).json({ pr: encoded, id });
   } else {
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
