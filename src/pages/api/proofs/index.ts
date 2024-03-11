import type { NextApiRequest, NextApiResponse } from 'next';
import { createProof } from '@/lib/proofModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method === 'POST') {
      const { id, amount, secret, C, userId } = req.body;

      if (!id || !amount || !secret || !C || !userId) {
         return res.status(400).json({ message: 'Missing required proof details' });
      }

      try {
         const newProof = await createProof({ proofId: id, amount, secret, C, userId });

         return res.status(201).json(newProof);
      } catch (error: any) {
         console.error('Failed to create proof:', error);
         return res.status(500).json({ message: 'Failed to create proof', error: error.message });
      }
   } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
