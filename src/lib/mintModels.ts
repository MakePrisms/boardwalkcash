import { CashuMint } from '@cashu/cashu-ts';
import prisma from './prisma';
import { MintKeyset } from '@prisma/client';

export async function findOrCreateMint(
   mintUrl: string,
   keysetId?: string,
): Promise<{ url: string; keysets: MintKeyset[] }> {
   console.log('Mint URL:', mintUrl);
   const mintLocal = await prisma.mint.findUnique({
      where: { url: mintUrl },
      include: { keysets: true },
   });
   console.log('Mint Local:', mintLocal);

   if (mintLocal) {
      const keysets = mintLocal.keysets;
      if (keysetId && !mintLocal.keysets.some(k => k.id === keysetId)) {
         console.log('Adding keyset to mint:', mintUrl, keysetId);
         const keyset = await addKeysetToMint(mintUrl, keysetId);
         console.log('Keyset added:', keyset);
         keysets.push(keyset);
      }
      return { url: mintLocal.url, keysets };
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
                  createMany: {
                     data: mintKeysetData,
                  },
               },
            },
            include: {
               keysets: true,
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

export async function addKeysetToMint(mintUrl: string, keysetId: string) {
   const mint = await prisma.mint.findUnique({
      where: { url: mintUrl },
      include: { keysets: true },
   });

   if (!mint) {
      throw new Error('Mint not found');
   }
   const mintClass = new CashuMint(mintUrl);

   const keyset = await mintClass
      .getKeys(keysetId)
      .then(({ keysets }) => keysets.find(k => k.id === keysetId));
   if (!keyset) {
      throw new Error('Keyset not found');
   }

   const keysStringArray = Object.entries(keyset.keys).map(
      ([tokenAmt, pubkey]) => `${tokenAmt}:${pubkey}`,
   );

   const updatedMint = await prisma.mint.update({
      where: { url: mintUrl },
      data: {
         keysets: {
            create: {
               id: keysetId,
               unit: keyset.unit,
               keys: keysStringArray,
            },
         },
      },
      include: { keysets: true },
   });
   const updatedKeyset = updatedMint.keysets.find(k => k.id === keysetId);
   if (!updatedKeyset) {
      throw new Error('Keyset not found');
   }
   return updatedKeyset;
}
