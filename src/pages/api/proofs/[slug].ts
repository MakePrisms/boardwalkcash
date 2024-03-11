import type { NextApiRequest, NextApiResponse } from 'next';
import { findProofsByUserId, updateProof, deleteProof } from '@/lib/proofModels';
import { findUserByPubkey } from '@/lib/userModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const { slug } = req.query;

   if (!slug || slug === 'undefined') {
      res.status(404).json({ error: 'Not found' });
      return;
   }

   switch (req.method) {
      case 'GET':
         try {
            const user = await findUserByPubkey(String(slug));
            if (!user) {
               return res.status(404).json({ message: 'User not found' });
            }

            const proofs = await findProofsByUserId(user.id);

            if (proofs) {
               return res.status(200).json({ proofs, receiving: user.receiving });
            } else {
               return res.status(404).json({ message: 'Proof not found' });
            }
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      case 'PUT':
         try {
            const { amount, secret, C } = req.body;
            const updatedProof = await updateProof(Number(slug), amount, secret, C);
            return res.status(200).json(updatedProof);
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      case 'DELETE':
         try {
            await deleteProof(Number(slug));
            return res.status(204).end();
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      default:
         res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
         res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}
