import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '@/lib/userModels';
import { findOrCreateMint } from '@/lib/mintModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method === 'POST') {
      try {
         const { pubkey, mintUrl } = req.body;

         if (!pubkey) {
            return res.status(400).json({ message: 'Pubkey is required' });
         }
         if (!mintUrl) {
            return res.status(400).json({ message: 'Mint URL is required' });
         }

         const mintLocal = await findOrCreateMint(mintUrl);

         const user = await createUser(pubkey, mintLocal);

         return res.status(200).json(user);
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
