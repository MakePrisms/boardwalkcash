import { AuthenticatedRequest, GetCashuPRLastPaidResponse } from '@/types';
import { NextApiResponse } from 'next';
import { getPaymentRequestByIdIncludeToken } from '@/lib/paymentRequestModels';
import { runAuthMiddleware } from '@/utils/middleware';

export default async function handler(
   req: AuthenticatedRequest,
   res: NextApiResponse<GetCashuPRLastPaidResponse | { error: string }>,
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

         /* get most recent token by createdAt timestamp */
         const latestToken =
            paymentRequest.tokens.length > 0
               ? paymentRequest.tokens.reduce((latest, token) =>
                    token.createdAt > latest.createdAt ? token : latest,
                 )
               : null;

         if (!latestToken) {
            return res.status(200).json({ token: null, lastPaid: null });
         }

         return res.status(200).json({
            lastPaid: latestToken.createdAt.toISOString(),
            token: latestToken.token,
         });
      } catch (error) {
         console.error('Error fetching last paid timestamp:', error);
         return res.status(500).json({ error: 'Internal server error' });
      }
   } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
