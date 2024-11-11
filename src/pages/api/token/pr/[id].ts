import { NextApiRequest, NextApiResponse } from 'next';
import {
   getPaymentRequestById,
   getPaymentRequestByIdIncludeToken,
} from '@/lib/paymentRequestModels';
import { AuthenticatedRequest, CheckPaymentRequestResponse } from '@/types';
import { runAuthMiddleware } from '@/utils/middleware';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
   await runAuthMiddleware(req, res);
   if (req.method === 'GET') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
         return res.status(400).json({ error: 'Invalid payment request ID' });
      }

      try {
         const paymentRequest = await getPaymentRequestByIdIncludeToken(id);

         if (paymentRequest?.userPubkey !== req.authenticatedPubkey) {
            return res.status(403).json({ error: 'Unauthorized' });
         }

         if (!paymentRequest) {
            return res.status(404).json({ error: 'Payment request not found' });
         }

         if (!paymentRequest.token) {
         }

         return res.status(200).json({
            id: paymentRequest.id,
            paid: paymentRequest.paid,
            token: paymentRequest.token?.token,
            createdAt: paymentRequest.createdAt,
            updatedAt: paymentRequest.updatedAt,
         } as CheckPaymentRequestResponse);
      } catch (error) {
         console.error('Error fetching payment request:', error);
         return res.status(500).json({ error: 'Internal server error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
