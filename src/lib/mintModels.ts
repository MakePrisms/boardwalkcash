import { CashuMint } from '@cashu/cashu-ts';
import prisma from './prisma';

export async function findOrCreateMint(mintUrl: string) {
   const mintLocal = await prisma.mint.findUnique({ where: { url: mintUrl } });

   if (mintLocal) {
      return mintLocal;
   } else {
      try {
         const mint = new CashuMint(mintUrl);

         const { keysets } = await mint.getKeys();

         const mintKeysetData = keysets.map(keyset => {
            const { keys, id, unit } = keyset;

            const keysStringArray = Object.entries(keys).map(
               ([tokenAmt, pubkey]) => `${tokenAmt}:${pubkey}`,
            );

            return {
               id,
               unit,
               keys: keysStringArray,
            };
         });

         const newMint = await prisma.mint.create({
            data: {
               url: mintUrl,
               keysets: {
                  create: mintKeysetData,
               },
            },
         });

         return newMint;
      } catch (e) {
         console.error('Error fetching mint keys', e);
         throw new Error('Error creating a new mint. Make sure the mint URL is active.');
      }
   }
}

export async function findMintByUrl(mintUrl: string) {
   const mintLocal = await prisma.mint.findUnique({
      where: { url: mintUrl },
      include: { keysets: true },
   });

   if (!mintLocal) {
      throw new Error('Mint not found');
   }

   return mintLocal;
}

export async function findKeysetById(keysetId: string) {
   const keyset = await prisma.mintKeyset.findUnique({
      where: { id: keysetId },
      include: { mint: true },
   });

   return keyset;
}
