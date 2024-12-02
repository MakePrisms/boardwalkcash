import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTokenResponse } from '@/types';
import { findTokenByTxId } from '@/lib/tokenModels';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<GetTokenResponse | { error: string }>,
) {
   const { txid } = req.query;

   if (typeof txid !== 'string') {
      return res.status(400).json({ error: 'Txid is required as a string' });
   }

   if (req.method === 'GET') {
      try {
         const token = await findTokenByTxId(txid);
         if (!token) {
            return res.status(404).json({ error: 'Token not found' });
         }
         return res.status(200).json(token);
      } catch (error: any) {
         return res.status(500).json({ error: error.message });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
