import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import {
   setBalance,
} from '@/redux/slices/Wallet.slice';
import {
   setSuccess,
   setReceiving,
   setNotReceiving,
} from '@/redux/slices/ActivitySlice';
import { ProofData } from '@/types';
import {
   Proof,
} from '@cashu/cashu-ts';
import { CashuWallet, CashuMint } from '@cashu/cashu-ts';
import { RootState } from '@/redux/store';
import { useProofStorage } from './useProofStorage';

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

   const deleteProofById = async (proofId: string) => {
      try {
         await axios
            .delete(`/api/proofs/${proofId}`)
            .then(response => {
               console.log(
                  `Proof with ID ${proofId} deleted drom database and moved into local storage.`,
               );
            })
            .catch(error => {
               console.log(error);
            });
      } catch (error) {
         console.error(`Failed to delete proof with ID ${proofId}:`, error);
      }
   };

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
         const pollingResponse = await axios.get(`/api/proofs/${pubkey}`);

         const isReceiving = pollingResponse.data?.receiving;

         if (isReceiving) {
            dispatch(setReceiving('Receiving...'));
         } else {
            dispatch(setNotReceiving());
         }

         const proofsFromDb = pollingResponse.data.proofs;
         const formattedProofs = proofsFromDb.map((proof: ProofData) => ({
            C: proof.C,
            amount: proof.amount,
            id: proof.proofId,
            secret: proof.secret,
         }));

         const localProofs = getProofs();
         const newProofs = formattedProofs.filter(
            (proof: ProofData) =>
               !localProofs.some((localProof: Proof) => localProof.secret === proof.secret),
         );

         if (newProofs.length === 0) return;

         let updatedProofs;
         if (newProofs.length > 0) {
            addProofs(newProofs);

            const totalReceived = newProofs
               .map((proof: Proof) => proof.amount)
               .reduce((a: number, b: number) => a + b, 0);

            dispatch(setSuccess(`Received $${(totalReceived / 100).toFixed(2)}!`));

            // Delete new proofs from the database
            // get the index as well
            for (const proof of newProofs) {
               const proofId = proofsFromDb.find((p: ProofData) => p.secret === proof.secret).id;
               console.log('Deleting proof with ID:', proofId);
               await deleteProofById(proofId);
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

   const fetchUnitFromProofs = async (mintUrl: string, proofs: Proof[]) => {
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

      return keyset.unit;
   };

   return {
      fetchUnitFromProofs,
      updateProofsAndBalance,
      checkProofsValid,
   };
};
