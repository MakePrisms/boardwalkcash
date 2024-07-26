import { findKeysetById, findOrCreateMint } from '@/lib/mintModels';
import { createMintQuote } from '@/lib/mintQuoteModels';
import { updateUser } from '@/lib/userModels';
import { authMiddleware, runMiddleware } from '@/utils/middleware';
import { NextApiRequest, NextApiResponse } from 'next';

export type PostMintQuoteApiResponse = {
   message: string;
};

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, authMiddleware);
   const { quoteId, request, pubkey, keysetId, mintUrl } = req.body;

   if (!quoteId || !request || !pubkey || !keysetId) {
      return res
         .status(400)
         .json({ message: 'quoteId, request, pubkey, and keysetId are required' });
   }

   const keyset = await findKeysetById(keysetId);

   if (!keyset && !mintUrl) {
      return res.status(404).json({
         message:
            'Mintkeyset must exist in the database. Include a mintUrl in the req.body to have one created for you.',
      });
   }

   if (!keyset && mintUrl) {
      await findOrCreateMint(mintUrl);
   }

   try {
      await createMintQuote(quoteId, request, pubkey, keysetId);

      await updateUser(pubkey, { receiving: true });

      return res.status(201).json({ message: 'Mint quote created' } as PostMintQuoteApiResponse);
   } catch (error: any) {
      console.error('Failed to create mint quote:', error);
      return res.status(500).json({ message: 'Failed to create mint quote', error: error.message });
   }
}
