import { NextApiRequest, NextApiResponse } from 'next';
import { findUserByPubkey, removeContactFromUser } from '@/lib/userModels';
import { authMiddleware, runMiddleware } from '@/utils/middleware';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, authMiddleware);
   const { pubkey, contactPubkey } = req.query;

   if (
      !pubkey ||
      typeof pubkey !== 'string' ||
      !contactPubkey ||
      typeof contactPubkey !== 'string'
   ) {
      return res.status(400).json({ error: 'Invalid pubkey or contactPubkey' });
   }

   if (req.method === 'DELETE') {
      try {
         const user = await findUserByPubkey(pubkey);
         if (!user) {
            return res.status(404).json({ error: 'User not found' });
         }

         await removeContactFromUser(pubkey, contactPubkey);
         return res.status(200).json({ message: 'Contact deleted successfully' });
      } catch (error) {
         console.error('Error deleting contact:', error);
         return res.status(500).json({ error: 'Internal server error' });
      }
   } else {
      res.setHeader('Allow', ['DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
