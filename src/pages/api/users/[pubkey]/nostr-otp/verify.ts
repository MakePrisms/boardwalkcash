import { NextApiRequest, NextApiResponse } from 'next';
import { findUserByPubkey, updateUser } from '@/lib/userModels';
import { VerifyNostrOtpRequest, VerifyNostrOtpResponse } from '@/types';
import { getPendingOtp, deleteOtp } from '@/lib/otp';
import { authMiddleware, runMiddleware } from '@/utils/middleware';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<VerifyNostrOtpResponse>,
) {
   await runMiddleware(req, res, authMiddleware);
   const { pubkey } = req.query;
   const { otp } = req.body as VerifyNostrOtpRequest;

   if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({ error: 'Invalid pubkey' });
   }

   if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }

   try {
      const user = await findUserByPubkey(pubkey);

      if (!user) {
         return res.status(404).json({ error: 'User not found' });
      }

      const savedOtp = await getPendingOtp(otp);

      if (!savedOtp) {
         return res.status(400).json({ error: 'Invalid OTP' });
      }

      if (savedOtp.userPubkey !== pubkey) {
         return res.status(400).json({ error: 'OTP is not for this user' });
      }

      /* add nostr pubkey to user */
      await updateUser(pubkey, { nostrPubkey: savedOtp.nostrPubkey });
      await deleteOtp(otp);

      return res.status(200).json({ nostrPubkey: savedOtp.nostrPubkey });
   } catch (error) {
      console.error('Error verifying OTP:', error);
      return res.status(500).end();
   }
}
