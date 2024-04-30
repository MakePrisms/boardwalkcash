import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { lockBalance, setBalance, unlockBalance } from '@/redux/slices/Wallet.slice';
import {
   setError,
   setSending,
   setSuccess,
   setReceiving,
   resetStatus,
   setNotReceiving,
} from '@/redux/slices/ActivitySlice';
import { ProofData, Wallet } from '@/types';
import {
   MeltQuoteResponse,
   MeltTokensResponse,
   MintKeys,
   MintQuoteResponse,
   Proof,
   getDecodedToken,
} from '@cashu/cashu-ts';
import { useToast } from './useToast';
import { CashuWallet, CashuMint, SendResponse } from '@cashu/cashu-ts';
import { getNeededProofs, addBalance, customMintQuoteRequest } from '@/utils/cashu';
import { RootState } from '@/redux/store';
import { useExchangeRate } from './useExchangeRate';
import { FolderMinusIcon } from '@heroicons/react/20/solid';
import { format } from 'path';

export const useCashu = () => {
   let intervalCount = 0;

   const dispatch = useDispatch();
   const { addToast } = useToast();
   const { satsToUnit, unitToSats } = useExchangeRate();

   const getProofs = (keysetId?: string) => {
      const allProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
      if (!keysetId) return allProofs;
      return allProofs.filter((proof: Proof) => proof.id === keysetId);
   };
   const wallet = useSelector((state: RootState) => state.wallet);
   const wallets = useSelector((state: RootState) => state.wallet.keysets);

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

   const requestMintInvoice = async (
      { unit, amount }: { unit: string; amount: number },
      keyset: Wallet,
   ) => {
      const wallet = new CashuWallet(new CashuMint(keyset.url), { ...keyset });

      const { quote, request } = await wallet.getMintQuote(amount);

      return { quote, request };
   };

   const handlePayInvoice = async (
      invoice: string,
      meltQuote: MeltQuoteResponse,
      estimatedFee: number,
      keyset: Wallet,
   ) => {
      const wallet = new CashuWallet(new CashuMint(keyset.url), { keys: keyset.keys });

      dispatch(setSending('Sending...'));
      dispatch(lockBalance());

      if (!invoice || isNaN(estimatedFee)) {
         addToast('Please enter an invoice and estimate the fee before submitting.', 'warning');
         dispatch(resetStatus());
         dispatch(unlockBalance());
         return;
      }

      const invoiceAmount = meltQuote.amount;
      const proofs = getNeededProofs(invoiceAmount + estimatedFee);
      let amountToPay = invoiceAmount + estimatedFee;

      const balance = proofs.reduce((acc: number, proof: Proof) => acc + proof.amount, 0);
      if (balance < amountToPay) {
         dispatch(setError('Insufficient balance to pay ' + amountToPay + ' sats'));
         addBalance(proofs);
         dispatch(unlockBalance());
         return;
      }

      try {
         let sendResponse: SendResponse;
         try {
            sendResponse = await wallet.send(amountToPay, proofs);
            addBalance(sendResponse.returnChange || []);
         } catch (e) {
            console.error('error swapping proofs', e);
            dispatch(setError('Payment failed'));
            addBalance(proofs);
            dispatch(unlockBalance());
            return;
         }
         if (sendResponse && sendResponse.send) {
            let invoiceResponse: MeltTokensResponse;
            try {
               invoiceResponse = await wallet.payLnInvoice(invoice, sendResponse.send, meltQuote);
            } catch (e) {
               console.error('error paying invoice', e);
               dispatch(setError('Payment failed'));
               dispatch(unlockBalance());
               addBalance(sendResponse.send);
               return;
            }
            if (!invoiceResponse || !invoiceResponse.isPaid) {
               dispatch(setError('Payment failed'));
               dispatch(unlockBalance());
            } else {
               addBalance(invoiceResponse.change || []);
               const newBalance = JSON.parse(localStorage.getItem('proofs') || '[]').reduce(
                  (acc: number, proof: Proof) => acc + proof.amount,
                  0,
               );

               const feePaid = balance - newBalance - invoiceAmount;
               const feeMessage =
                  feePaid > 0 ? ` + ${feePaid} sat${feePaid > 1 ? 's' : ''} fee` : '';

               dispatch(setSuccess(`Sent $${invoiceAmount / 100}!`));
            }
         }
      } catch (error) {
         console.error(error);
         addToast('An error occurred while trying to send.', 'error');
      } finally {
         dispatch(unlockBalance());
      }
   };

   const decodeToken = (token: string) => {
      try {
         const decodedToken = getDecodedToken(token);
         return decodedToken;
      } catch (e) {}
   };

   const checkProofsValid = async (wallet: CashuWallet) => {
      const localProofs = getProofs();

      if (localProofs.length === 0) {
         return;
      }

      try {
         // Call the check method
         const spentProofs = await wallet.checkProofsSpent(localProofs);

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
         console.error('Failed to check proofs:', error);
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
            updatedProofs = [...localProofs, ...newProofs];
            window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));

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

   const swapToMain = async (
      keyset: { id: string; url: string; unit: string; keys?: MintKeys },
      proofs?: Proof[],
      swapFrom?: CashuWallet,
      swapTo?: CashuWallet,
   ) => {
      console.log('Swapping from', swapFrom);
      console.log('Swapping to', swapTo);
      let calledGetProofs = false;
      if (!proofs) {
         proofs = getProofs(keyset.id);
         calledGetProofs = true;
      }

      if (proofs.length === 0) {
         addToast('No balance to swap', 'warning');
         return;
      }

      if (!swapFrom) {
         console.log('No swapFrom wallet found. Using keyset:', keyset.url);
         swapFrom = new CashuWallet(new CashuMint(keyset.url), { ...keyset });
      }

      const mainWallet = Object.values(wallets).find(w => w.active);
      if (!swapTo) {
         console.log('No swapTo wallet found. Using main wallet');

         if (!mainWallet) {
            addToast('No main wallet found', 'error');
            return;
         }

         console.log('Main wallet:', mainWallet.url);

         swapTo = new CashuWallet(new CashuMint(mainWallet.url), { ...mainWallet, unit: 'usd' });
      } else {
         console.log('Swapping to:', swapTo);
      }

      try {
         let totalProofAmount = proofs.reduce((a, b) => a + b.amount, 0);
         let amountToMint = totalProofAmount;

         let fee_reserve = Infinity;

         let mintQuoteRes;
         let meltQuote;
         let amountUsd;

         while (fee_reserve + amountToMint > totalProofAmount) {
            if (keyset.unit === 'sat') {
               amountUsd = await satsToUnit(amountToMint, 'usd');
               console.log('amountUsd:', amountUsd);
            } else {
               amountUsd = amountToMint;
            }

            mintQuoteRes = await swapTo.getMintQuote(amountUsd);

            console.log('swapTo:', swapTo);
            console.log('swapFrom', swapFrom);

            console.log('mintQuoteRes:', mintQuoteRes);

            meltQuote = await swapFrom.getMeltQuote(mintQuoteRes.request);

            console.log('meltQuote:', meltQuote);

            if (!meltQuote) {
               addToast('Failed to get melt quote', 'error');
               return;
            }

            fee_reserve = meltQuote.fee_reserve;

            if (keyset.unit === 'sat') {
               amountToMint = totalProofAmount - fee_reserve;
               amountUsd = await satsToUnit(amountToMint, 'usd');
            } else {
               amountToMint = amountUsd - fee_reserve;
            }
         }

         console.log('amountToMint:', amountToMint);
         console.log('fee_reserve:', fee_reserve);
         console.log('totalProofAmount:', totalProofAmount);

         if (!mintQuoteRes || !meltQuote || !amountUsd) {
            throw new Error('Failed to get mint or melt quote');
         }

         console.log('mintQuote', mintQuoteRes);

         const meltRes = await swapFrom.meltTokens(meltQuote, proofs, { keysetId: keyset.id });

         console.log('meltRes:', meltRes);

         const { proofs: newProofs } = await swapTo.mintTokens(amountUsd, mintQuoteRes?.quote);

         if (calledGetProofs) {
            console.log('dangerously setting all proofs to newProofs');
            const updatedProofs = getProofs().filter(proof => proof.id !== swapFrom.keys.id);
            updatedProofs.push(...newProofs);

            console.log('updatedProofs:', updatedProofs);

            window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
         } else {
            addBalance(newProofs);
         }

         const newBalance = getProofs().reduce((a, b) => a + b.amount, 0);

         dispatch(setBalance({ usd: newBalance }));

         let successMsg = '';
         if (swapTo.mint.mintUrl === mainWallet?.url) {
            successMsg = `Swapped $${(amountUsd / 100).toFixed(2)} to your main mint`;
         } else {
            let formattedUrl = swapTo.mint.mintUrl.replace('https://', '');
            formattedUrl = `${formattedUrl.slice(0, 15)}...${formattedUrl.slice(-5)}`;
            successMsg = `Swapped $${(amountUsd / 100).toFixed(2)} to ${formattedUrl}`;
         }

         addToast(successMsg, 'success');
      } catch (e: any) {
         console.error('Failed to swap proofs:', e);
         addToast(`Failed to swap proofs - ${e.message && e.message}`, 'error');
      }
   };

   const swapToSend = async (amount: number, keyset?: Wallet) => {
      keyset = keyset || Object.values(wallets).find(w => w.active);

      console.log('swapToSend.amount', amount);

      if (!keyset) {
         addToast('No active wallet found', 'error');
         throw new Error('No active wallet found');
      }

      const wallet = new CashuWallet(new CashuMint(keyset.url), { ...keyset });

      const proofs = getNeededProofs(amount, keyset.id);

      const storedProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
      console.log(
         'swapToSend.storedProfos',
         storedProofs.reduce((a, b) => a + b.amount, 0),
      );

      console.log('swapToSend.proofs', proofs);

      if (proofs.length === 0) {
         addToast('Insufficient balance', 'warning');
         throw new Error('Insufficient balance');
      }

      const { returnChange, send } = await wallet.send(amount, proofs);

      console.log('swapToSend.send', send);
      console.log('swapToSend.returnChange', returnChange);

      if (!send) {
         addToast('Failed to send', 'error');
         throw new Error('Failed to send');
      }

      addBalance(returnChange);

      addToast(`Preparing to send: swapped $${(amount / 100).toFixed(2)}`, 'success');

      return { proofs: send, wallet };
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

   useEffect(() => {
      updateProofsAndBalance();

      const intervalId = setInterval(() => {
         updateProofsAndBalance();

         // Increment the counter
         intervalCount += 1;

         // Every fourth interval, call checkProofsValid
         if (intervalCount >= 4) {
            Object.values(wallets).forEach(w => {
               const wallet = new CashuWallet(new CashuMint(w.url), { ...w });
               checkProofsValid(wallet);
            });
            intervalCount = 0;
         }
      }, 3000); // Poll every 3 seconds

      return () => {
         clearInterval(intervalId);
      };
   }, [dispatch]);

   return {
      handlePayInvoice,
      requestMintInvoice,
      swapToMain,
      decodeToken,
      swapToSend,
      fetchUnitFromProofs,
   };
};
