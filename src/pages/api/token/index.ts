import { createTokenInDb } from '@/lib/tokenModels';
import { PostTokenRequest, PostTokenResponse } from '@/types';
import { computeTxId, getProofsFromToken } from '@/utils/cashu';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   console.log('req', req.body);
   if (req.method === 'POST') {
      try {
         const { token } = req.body as PostTokenRequest;

         if (!token) {
            return res.status(400).json({ message: 'Token is required' });
         }

         console.log('creating token in db', token);

         const proofs = getProofsFromToken(token);

         const txid = computeTxId(proofs);

         await createTokenInDb(token, txid);

         return res.status(200).json({ txid } as PostTokenResponse);
      } catch (error: any) {
         return res.status(500).json({ message: error.message });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
