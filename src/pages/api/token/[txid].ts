import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTokenResponse } from '@/types';
import { findTokenByTxId } from '@/lib/tokenModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const { txid } = req.query;

   if (typeof txid !== 'string') {
      return res.status(400).json({ message: 'Txid is required as a string' });
   }

   if (req.method === 'GET') {
      try {
         const token = await findTokenByTxId(txid);
         if (!token) {
            return res.status(404).json({ message: 'Token not found' });
         }
         return res.status(200).json(token as GetTokenResponse);
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
