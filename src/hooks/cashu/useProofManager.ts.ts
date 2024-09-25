import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBalance } from '@/redux/slices/Wallet.slice';
import { setSuccess, setReceiving, setNotReceiving } from '@/redux/slices/ActivitySlice';
import { Proof } from '@cashu/cashu-ts';
import { CashuWallet, CashuMint } from '@cashu/cashu-ts';
import { RootState } from '@/redux/store';
import { useProofStorage } from './useProofStorage';
import { getProofsFromServer, deleteProofById } from '@/utils/appApiRequests';
import { formatUnit } from '@/utils/formatting';

export const useProofManager = () => {
   const dispatch = useDispatch();
   const { addProofs } = useProofStorage();

   const getProofs = (keysetId?: string) => {
      const allProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
      if (!keysetId) return allProofs;
      return allProofs.filter((proof: Proof) => proof.id === keysetId);
   };
   const wallet = useSelector((state: RootState) => state.wallet);

   useEffect(() => {
      const localProofs = getProofs();
      const balanceState = wallet.balance['usd'];

      const newBalance = localProofs.reduce((a, b) => a + b.amount, 0);

      if (balanceState !== newBalance) {
         dispatch(setBalance({ usd: newBalance }));
      }
   }, [wallet.balance]);

   const checkProofsValid = async (wallet: CashuWallet) => {
      const localProofs = getProofs().filter(proof => proof.id === wallet.keys.id);

      if (localProofs.length === 0) {
         return;
      }

      try {
         // Call the check method
         const chunkArray = <T>(array: T[], chunkSize: number) => {
            const chunks = [];
            for (let i = 0; i < array.length; i += chunkSize) {
               chunks.push(array.slice(i, i + chunkSize));
            }
            return chunks;
         };

         // Process in batches of 10
         const batchSize = 10;
         const proofChunks = chunkArray(localProofs, batchSize);
         const spentProofs: Proof[] = [];

         for await (const chunk of proofChunks) {
            const spent = await wallet.checkProofsSpent(chunk);
            spentProofs.push(...spent);
         }

         if (spentProofs.length > 0) {
            // Filter out non-spendable proofs
            const spendableProofs = localProofs.filter(
               (proof: Proof, index: number) => !spentProofs.includes(proof),
            );

            // If the spendable proofs have changed, update the local storage
            if (spendableProofs.length !== localProofs.length) {
               window.localStorage.setItem('proofs', JSON.stringify(spendableProofs));
            }
         }
      } catch (error) {
         // console.error('Failed to check proofs:', error);
      }
   };

   const updateProofsAndBalance = async () => {
      const pubkey = window.localStorage.getItem('pubkey');
      if (!pubkey) {
         return;
      }

      try {
         const pollingResponse = await getProofsFromServer(pubkey);

         const isReceiving = pollingResponse.receiving;

         if (isReceiving) {
            dispatch(setReceiving('Receiving...'));
         } else {
            dispatch(setNotReceiving());
         }

         const proofsFromDb = pollingResponse.proofs;
         const formattedProofs = proofsFromDb.map(proof => ({
            C: proof.C,
            amount: proof.amount,
            id: proof.proofId,
            secret: proof.secret,
            unit: proof.MintKeyset.unit,
         }));

         const localProofs = getProofs();
         const newProofs = formattedProofs.filter(
            (proof: Proof) =>
               !localProofs.some((localProof: Proof) => localProof.secret === proof.secret),
         );

         if (newProofs.length === 0) return;

         let updatedProofs;
         if (newProofs.length > 0) {
            addProofs(newProofs);

            const totalReceived = newProofs
               .map((proof: Proof) => proof.amount)
               .reduce((a: number, b: number) => a + b, 0);

            dispatch(setSuccess(`Received ${formatUnit(totalReceived, newProofs[0].unit)}!`));

            // Delete new proofs from the database
            // get the index as well
            for (const proof of newProofs) {
               const proofId = proofsFromDb.find(p => p.secret === proof.secret)?.id;
               if (proofId) {
                  console.log('Deleting proof with ID from db:', proofId);
                  await deleteProofById(proofId).catch(error => {
                     console.error('Failed to delete proof:', error);
                  });
               }
            }
         } else {
            updatedProofs = localProofs;
         }

         const newBalance =
            updatedProofs
               ?.map((proof: Proof) => proof.amount)
               .reduce((a: number, b: number) => a + b, 0) || 0;
         dispatch(setBalance({ usd: newBalance }));
      } catch (error) {
         console.error('Failed to update proofs and balance:', error);
      }
   };

   const fetchUnitFromProofs = async (mintUrl: string, proofs: Proof[]): Promise<'sat' | 'usd'> => {
      if (proofs.length === 0) {
         throw new Error('fetchUnitFromProofs failed: No proofs');
      }

      const keysetId = proofs[0].id;

      const cashuWallet = new CashuWallet(new CashuMint(mintUrl));

      const mintKeysets = await cashuWallet.mint.getKeys().then(({ keysets }) => keysets);

      console.log('mintKeyset', mintKeysets);

      const keyset = mintKeysets.find(keyset => keyset.id === keysetId);

      if (!keyset) {
         throw new Error('fetchUnitFromProofs failed: No keyset found');
      }

      if (keyset.unit !== 'usd' && keyset.unit !== 'sat') {
         throw new Error('fetchUnitFromProofs failed: Invalid unit');
      }

      return keyset.unit;
   };

   return {
      fetchUnitFromProofs,
      updateProofsAndBalance,
      checkProofsValid,
   };
};
