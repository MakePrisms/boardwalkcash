import { NextApiRequest, NextApiResponse } from 'next';
import { findUserByPubkey } from '@/lib/userModels';
import { GenerateNostrOtpRequest } from '@/types';
import { generateOtp } from '@/lib/otp';
import { sendOtp } from '@/utils/nostr';
import { authMiddleware, runMiddleware } from '@/utils/middleware';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, authMiddleware);
   const { pubkey } = req.query;
   const { nostrPubkey } = req.body as GenerateNostrOtpRequest;

   if (!nostrPubkey || typeof nostrPubkey !== 'string' || nostrPubkey.startsWith('npub')) {
      return res.status(400).json({ error: 'Invalid nostr pubkey' });
   }

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

      const otp = await generateOtp(nostrPubkey, pubkey);

      console.log('otp', otp);

      await sendOtp({ pubkey: nostrPubkey }, otp.otpCode);

      return res.status(200).json({ message: 'OTP generated' });
   } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).end();
   }
}
