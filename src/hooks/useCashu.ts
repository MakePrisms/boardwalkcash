import { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import {
   lockBalance,
   setBalance,
   unlockBalance,
   updateKeysetStatus,
} from '@/redux/slices/Wallet.slice';
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
   getEncodedToken,
} from '@cashu/cashu-ts';
import { useToast } from './useToast';
import { CashuWallet, CashuMint, SendResponse } from '@cashu/cashu-ts';
import { getNeededProofs, addBalance, customMintQuoteRequest } from '@/utils/cashu';
import { RootState } from '@/redux/store';
import { useExchangeRate } from './useExchangeRate';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useNostrMintConnect } from '@/hooks/useNostrMintConnect';
import { createBlindedMessages } from '@/utils/crypto';
import { constructProofs } from '@cashu/cashu-ts/dist/lib/es5/DHKE';

export const useCashu = () => {
   const dispatch = useDispatch();
   const { addToast } = useToast();
   const { satsToUnit, unitToSats } = useExchangeRate();
   const [reserveKeyset, setReserveKeyset] = useState<Wallet | null>(null);
   const { requestDeposit, requestSignatures } = useNostrMintConnect();

   const getProofs = (keysetId?: string) => {
      const allProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
      if (!keysetId) return allProofs;
      return allProofs.filter((proof: Proof) => proof.id === keysetId);
   };
   const wallet = useSelector((state: RootState) => state.wallet);
   const wallets = useSelector((state: RootState) => state.wallet.keysets);

   useEffect(() => {
      const reserveKeyset = Object.values(wallets).find(w => w.isReserve);

      if (reserveKeyset) {
         setReserveKeyset(reserveKeyset);
      } else {
         setReserveKeyset(null);
      }
   }, [wallets]);

   const setKeysetNotReserve = () => {
      if (!reserveKeyset) {
         return;
      }

      dispatch(updateKeysetStatus({ id: reserveKeyset.id, isReserve: false }));
   };

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

      try {
         const { quote, request } = await wallet.getMintQuote(amount);

         return { quote, request };
      } catch (error: any) {
         console.error('Failed to get mint quote:', error);
         if (error.message) {
            if (error.message === 'Bad Request') {
               dispatch(setError('Error: minting is probably disabled'));
            } else {
               dispatch(setError(error.message));
            }
            throw new Error('Error getting mint quote', error);
         }
         dispatch(setError('Error: main mint is offline or minting is disabled'));
         throw error;
      }
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
      const proofs = getNeededProofs(invoiceAmount + estimatedFee, keyset.id);
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
               dispatch(unlockBalance());
               dispatch(setBalance({ usd: newBalance }));
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

   const createSendableEcashToken = async (amount: number, wallet: CashuWallet) => {
      console.log('Send Ecash', amount);
      if (amount <= 0) {
         addToast('Enter an amount to send', 'error');
         return;
      }

      console.log(
         'TOtal balance. About to send',
         (JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[]).reduce(
            (a, b) => a + b.amount,
            0,
         ),
      );

      // TODO: make is so that I can use CashuWallet directly
      const keyset: Wallet = {
         id: wallet.keys.id,
         url: wallet.mint.mintUrl,
         proofs: [],
         keys: wallet.keys,
         active: true,
         isReserve: false,
      };

      const { proofs: newProofs } = await swapToSend(amount, keyset);

      console.log(
         'Balance after sending',
         (JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[]).reduce(
            (a, b) => a + b.amount,
            0,
         ),
      );

      console.log('Send Ecash', newProofs);

      if (!newProofs) {
         return;
      }

      const token = getEncodedToken({
         token: [{ proofs: newProofs, mint: keyset.url }],
         unit: 'usd',
      });

      dispatch(
         addTransaction({
            type: 'ecash',
            transaction: {
               token: token,
               amount: -amount,
               unit: 'usd',
               mint: keyset.url,
               status: TxStatus.PENDING,
               date: new Date().toLocaleString(),
            },
         }),
      );

      return token;
   };

   const swapToMain = async (
      keyset: { id: string; url: string; unit: string; keys?: MintKeys },
      proofs: Proof[],
      swapFrom?: CashuWallet,
      swapTo?: CashuWallet,
   ) => {
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
         swapFrom = new CashuWallet(new CashuMint(keyset.url), { ...keyset });
      }

      const mainWallet = Object.values(wallets).find(w => w.active);
      if (!swapTo) {
         if (!mainWallet) {
            addToast('No main wallet found', 'error');
            return;
         }

         swapTo = new CashuWallet(new CashuMint(mainWallet.url), { ...mainWallet, unit: 'usd' });
      }

      console.log('## Swapping from', swapFrom?.mint.mintUrl);
      console.log('## Swapping to', swapTo?.mint.mintUrl);

      try {
         let totalProofAmount = proofs.reduce((a, b) => a + b.amount, 0);
         let amountToMint = totalProofAmount;

         let fee_reserve = Infinity;

         let mintQuoteRes;
         let meltQuote;
         let amountUsd;

         const shouldSwapInstead = proofs[0].id === swapTo.keys.id;

         if (!shouldSwapInstead && mainWallet?.isReserve) {
            console.log('Swapping to reserve');
            const connectionUri = localStorage.getItem('reserve');

            if (!connectionUri) {
               addToast('ERROR: No reserve connection found', 'error');
               return;
            }

            let invoice: string;
            while (amountToMint + fee_reserve > totalProofAmount) {
               const { invoice } = await requestDeposit(connectionUri, amountToMint);

               console.log('depositInvoice', invoice);

               if (!invoice) {
                  addToast('Failed to get invoice from reserve', 'error');
                  return;
               }

               meltQuote = await swapFrom.getMeltQuote(invoice);

               console.log('meltQuote', meltQuote);

               if (!meltQuote) {
                  addToast('Failed to get melt quote', 'error');
                  return;
               }

               fee_reserve = meltQuote.fee_reserve;
               amountToMint = totalProofAmount - fee_reserve;
            }

            if (!meltQuote) {
               throw new Error('Failed to get melt quote');
            }

            const { preimage, isPaid } = await swapFrom.meltTokens(meltQuote, proofs, {
               keysetId: keyset.id,
            });

            if (preimage || isPaid) {
               console.log('Melted tokens successfully and paid reserve deposit');
               const { blindedMessages, secrets, rs } = createBlindedMessages(
                  amountToMint,
                  mainWallet.id,
               );

               const blindSignatures = await requestSignatures(connectionUri, blindedMessages);

               const newProofs = constructProofs(blindSignatures, rs, secrets, mainWallet.keys);

               const updatedProofs = getProofs().filter(proof => proof.id !== swapFrom.keys.id);

               updatedProofs.push(...newProofs);

               window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));

               const newBalance = getProofs().reduce((a, b) => a + b.amount, 0);

               dispatch(setBalance({ usd: newBalance }));

               addToast(`Swapped $${(amountToMint / 100).toFixed(2)} to reserve`, 'success');
            }
         } else if (!shouldSwapInstead) {
            // loop until melt/melt total amount is less than totalProofAmount
            while (fee_reserve + amountToMint > totalProofAmount) {
               if (keyset.unit === 'sat') {
                  amountUsd = await satsToUnit(amountToMint, 'usd');
                  console.log('amountUsd:', amountUsd);
               } else {
                  amountUsd = amountToMint;
               }

               try {
                  mintQuoteRes = await swapTo.getMintQuote(amountUsd);
               } catch (e: any) {
                  console.error('Failed to get mint quote:', e.detail);
                  if (e.message) {
                     throw new Error(e.message);
                  }
                  throw new Error('main mint is offline or minting is disabled');
               }

               meltQuote = await swapFrom.getMeltQuote(mintQuoteRes.request);

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

            if (!mintQuoteRes || !meltQuote || !amountUsd) {
               throw new Error('Failed to get mint or melt quote');
            }
            await swapFrom.meltTokens(meltQuote, proofs, { keysetId: keyset.id });

            const { proofs: newProofs } = await swapTo.mintTokens(amountUsd, mintQuoteRes?.quote);

            if (calledGetProofs) {
               console.log('dangerously setting all proofs to newProofs');
               const updatedProofs = getProofs().filter(proof => proof.id !== swapFrom.keys.id);
               updatedProofs.push(...newProofs);

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
         } else {
            // Use swap function directly
            const swapRes = await swapTo.receiveTokenEntry({
               proofs: proofs,
               mint: swapTo.mint.mintUrl,
            });

            if (swapRes.proofsWithError) {
               addToast('Failed to claim proofs', 'error');
               return;
            }

            if (calledGetProofs) {
               console.log('dangerously setting all proofs to newProofs');
               const updatedProofs = getProofs().filter(proof => proof.id !== swapFrom.keys.id);
               updatedProofs.push(...swapRes.proofs);

               window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
            } else {
               addBalance(swapRes.proofs);
            }

            const newBalance = getProofs().reduce((a, b) => a + b.amount, 0);

            dispatch(setBalance({ usd: newBalance }));

            let successMsg = '';
            const amountUsd = proofs.reduce((a, b) => a + b.amount, 0);
            if (swapTo.mint.mintUrl === mainWallet?.url) {
               successMsg = `Swapped $${(amountUsd / 100).toFixed(2)} to your main mint`;
            } else {
               let formattedUrl = swapTo.mint.mintUrl.replace('https://', '');
               formattedUrl = `${formattedUrl.slice(0, 15)}...${formattedUrl.slice(-5)}`;
               successMsg = `Swapped $${(amountUsd / 100).toFixed(2)} to ${formattedUrl}`;
            }

            addToast(successMsg, 'success');
         }
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
         addToast('Insufficient balance in active mint', 'warning');
         throw new Error('Insufficient balance');
      }

      try {
         const { returnChange, send } = await wallet.send(amount, proofs);

         console.log('swapToSend.send', send);
         console.log('swapToSend.returnChange', returnChange);

         if (!send) {
            addToast('Failed to send', 'error');
            throw new Error('Failed to send');
         }

         addBalance(returnChange);

         const newBalance = getProofs().reduce((a, b) => a + b.amount, 0);
         dispatch(setBalance({ usd: newBalance }));

         return { proofs: send, wallet };
      } catch (e: any) {
         console.log('swapToSend.error', e.message);
         const msg = e.message ? e.message : 'Failed to swap to send';
         addToast(msg, 'error');
         throw new Error(msg);
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

   const payInvoice = async (invoice: string) => {
      console.log('=========MELTING TOKENS=========+');

      const activeWallet = Object.values(wallets).find(w => w.active);

      if (!activeWallet) {
         throw new Error('No active wallet found');
      }

      const wallet = new CashuWallet(new CashuMint(activeWallet.url), { ...activeWallet });

      const meltQuote = await wallet.getMeltQuote(invoice);

      console.log(`## GOT MELT QUOTE:`, meltQuote);

      dispatch(lockBalance());
      dispatch(setSending('Processing payment...'));

      const proofs = getNeededProofs(meltQuote.amount + meltQuote.fee_reserve, activeWallet.id);

      if (proofs.length === 0) {
         addToast('Insufficient balance in active mint', 'warning');
         console.log('TODO: throw INSUFFICIENT BALANCE error and catch with the nwc processor');
         throw new Error('Insufficient balance');
      }

      const { send, returnChange } = await wallet
         .send(meltQuote.amount + meltQuote.fee_reserve, proofs)
         .catch(e => {
            addBalance(proofs);

            addToast('Failed to send', 'error');

            throw new Error('Failed to send', e);
         });

      addBalance(returnChange);

      console.log('## SWAPPED FOR SENDABLE PROOFS: ', send);

      const { change, isPaid, preimage } = await wallet.meltTokens(meltQuote, send, {
         keysetId: activeWallet.id,
      });

      if (!isPaid) {
         addToast('Payment failed', 'error');
         throw new Error('Payment failed');
      }

      addBalance(change);

      addToast('Payment successful', 'success');

      dispatch(unlockBalance());

      const newBalance = getProofs().reduce((a, b) => a + b.amount, 0);
      dispatch(setBalance({ usd: newBalance }));

      dispatch(setSuccess(`Sent $${(meltQuote.amount / 100).toFixed(2)}`));

      return { preimage: preimage || '', amountUsd: meltQuote.amount };
   };

   return {
      handlePayInvoice,
      requestMintInvoice,
      swapToMain,
      decodeToken,
      swapToSend,
      fetchUnitFromProofs,
      updateProofsAndBalance,
      checkProofsValid,
      payInvoice,
      createSendableEcashToken,
      reserveKeyset,
      setKeysetNotReserve,
   };
};
