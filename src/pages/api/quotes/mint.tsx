import { createMintQuote } from '@/lib/mintQuoteModels';
import { updateUser } from '@/lib/userModels';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
   const { quoteId, request, pubkey } = req.body;

   try {
      await createMintQuote(quoteId, request, pubkey);

      await updateUser(pubkey, { receiving: true });

      return res.status(201).json({ message: 'Mint quote created' });
   } catch (error: any) {
      console.error('Failed to create mint quote:', error);
      return res.status(500).json({ message: 'Failed to create mint quote', error: error.message });
   }
}
