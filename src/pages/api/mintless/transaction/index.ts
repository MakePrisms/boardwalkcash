import { NextApiRequest, NextApiResponse } from 'next';
import { authMiddleware, runMiddleware } from '@/utils/middleware';
import { createMintlessTransactionAndNotification } from '@/lib/notificationModels';
import { MintlessTransactionRequest, MintlessTransactionResponse } from '@/types';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<MintlessTransactionResponse | { error: string }>,
) {
   await runMiddleware(req, res, authMiddleware);

   if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
   }

   const { giftId, amount, recipientPubkey, createdByPubkey, isFee }: MintlessTransactionRequest =
      req.body;

   if (!amount || !recipientPubkey || !createdByPubkey) {
      return res.status(400).json({ error: 'Missing required fields' });
   }

   try {
      const { mintlessTransaction, notification } = await createMintlessTransactionAndNotification(
         giftId,
         amount,
         recipientPubkey,
         createdByPubkey,
         isFee,
      );

      return res.status(201).json({
         id: mintlessTransaction.id,
         notificationId: notification.id.toString(),
      });
   } catch (error) {
      console.error('Error creating mintless transaction:', error);
      return res.status(500).json({ error: 'Failed to create mintless transaction' });
   }
}
