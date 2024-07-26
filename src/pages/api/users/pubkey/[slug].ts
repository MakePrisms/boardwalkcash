import { findContactByPubkey } from '@/lib/contactModels';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const { slug: pubkey } = req.query;

   if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({ message: 'Invalid pubkey' });
   }

   switch (req.method) {
      case 'GET':
         try {
            const user = await findContactByPubkey(pubkey.toString());
            if (user) {
               return res.status(200).json(user);
            } else {
               return res.status(404).json({ message: 'User not found' });
            }
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      default:
         res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
         res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
