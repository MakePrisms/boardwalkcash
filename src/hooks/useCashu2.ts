import {
   CashuWallet,
   MeltQuoteResponse,
   MintQuoteResponse,
   Proof,
   ApiError as CashuApiError,
   getEncodedToken,
   getDecodedToken,
} from '@cashu/cashu-ts';
import { useProofStorage } from './useProofStorage';
import { useNostrMintConnect } from './useNostrMintConnect';
import { useCashuContext } from '@/contexts/cashuContext';
import { useToast } from './useToast';
import { useAppDispatch } from '@/redux/store';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { setError, setSuccess } from '@/redux/slices/ActivitySlice';
import {
   CrossMintQuoteResult,
   InsufficientBalanceError,
   ReserveError,
   TransactionError,
} from '@/types';

type CrossMintSwapOpts = { proofs?: Proof[]; amount?: number; max?: boolean };

export const useCashu2 = () => {
   const { activeWallet, reserveWallet, getWallet, getMint } = useCashuContext();
   const {
      addProofs,
      removeProofs,
      getProofsByAmount,
      getAllProofsByKeysetId,
      balanceByWallet,
      balance,
      lockBalance,
      unlockBalance,
   } = useProofStorage();
   const { requestDeposit, getReserveUri, createProofsFromReserve, checkDeposit } =
      useNostrMintConnect();
   const { addToast, toastSwapSuccess, toastSwapError } = useToast();

   const dispatch = useAppDispatch();

   const getMintQuote = async (wallet: CashuWallet, amount: number): Promise<MintQuoteResponse> => {
      if (reserveWallet?.keys.id === wallet.keys.id) {
         const invoice = await requestDeposit(getReserveUri(), amount);
         return { request: invoice.invoice, quote: 'reserve' };
      } else {
         return wallet.getMintQuote(amount);
      }
   };

   const mintTokens = async (wallet: CashuWallet, amount: number, quote: MintQuoteResponse) => {
      let proofs: Proof[] = [];
      if (quote.quote === 'reserve') {
         console.log('minting to reserve');
         proofs = await createProofsFromReserve(getReserveUri(), amount, wallet.keys)
            .then(res => res)
            .catch(err => {
               throw new ReserveError(err);
            });
      } else {
         proofs = await wallet
            .mintTokens(amount, quote.quote, { keysetId: wallet.keys.id })
            .then(res => res.proofs)
            .catch(err => {
               throw err;
            });
      }
      return proofs;
   };

   /**
    * Gets a melt quote that is less than or equal to the totalProofsAmount and returns
    * the respective quotes from the source and destination mints.
    * @param fromWallet Wallet to melt tokens from
    * @param toWallet Wallet to mint tokens to
    * @param totalProofsAmount Sum of proofs to melt
    * @param maxAttempts Maximum number of attempts to find a valid quote
    * @returns CrossMintQuoteResult with the mint and melt quotes and the amount to mint
    * @throws Error if no valid quotes are found after maxAttempts
    */
   const getCrossMintQuotes = async (
      fromWallet: CashuWallet,
      toWallet: CashuWallet,
      totalProofsAmount: number,
      maxAttempts = 5,
   ): Promise<CrossMintQuoteResult> => {
      let attempts = 0;
      let amountToMint = totalProofsAmount;

      while (attempts < maxAttempts) {
         attempts++;

         const mintQuote = await getMintQuote(toWallet, amountToMint);
         const meltQuote = await fromWallet.getMeltQuote(mintQuote.request);
         if (meltQuote.amount + meltQuote.fee_reserve <= totalProofsAmount) {
            console.log('Found valid quotes');
            return { mintQuote, meltQuote, amountToMint };
         }
         amountToMint = amountToMint - meltQuote.fee_reserve - 1;
      }

      throw new Error('Failed to find valid quotes after maximum attempts');
   };

   /**
    * Swaps proofs from one mint to another mint.
    * @param {CashuWallet} from - to melt tokens from
    * @param {CashuWallet} to - to mint tokens to
    * @param {Object} opts - Options for the cross mint swap.
    * @param {Proof[]} [opts.proofs] - Specific proofs to melt. Mutually exclusive with `amount`.
    * @param {number} [opts.amount] - Amount to melt in sats. Mutually exclusive with `proofs`.
    * @param {boolean} [opts.max] - If true, melts all available proofs in the source wallet.
    * @throws {Error} Throws an error if both `proofs` and `amount` are specified.
    * @throws {InsufficientBalanceError} Throws if the source wallet has insufficient balance.
    * @throws {TransactionError} Throws if the melt or mint transaction fails.
    * @returns {Promise<void>}
    */
   const crossMintSwap = async (from: CashuWallet, to: CashuWallet, opts: CrossMintSwapOpts) => {
      if (Object.keys(opts).length > 1) {
         throw new Error('Can only specify one of `proofs`, `amount`, or `max`');
      }

      let proofsToMelt: Proof[] | null = [];
      if (opts.max) {
         proofsToMelt = getAllProofsByKeysetId(from.keys.id);
      } else if (opts.proofs) {
         proofsToMelt = opts.proofs;
      } else if (opts.amount) {
         proofsToMelt = getProofsByAmount(opts.amount, from.keys.id);
      }

      try {
         if (!proofsToMelt) {
            throw new InsufficientBalanceError(from.mint.mintUrl);
         } else if (proofsToMelt.length === 0) {
            addToast('No proofs to melt', 'warning');
            return;
         }

         const totalProofAmount = proofsToMelt.reduce((acc, p) => acc + p.amount, 0);

         console.log('total proof amount:', totalProofAmount);

         const { mintQuote, meltQuote, amountToMint } = await getCrossMintQuotes(
            from,
            to,
            totalProofAmount,
         );

         const { preimage, isPaid, change } = await from.meltTokens(meltQuote, proofsToMelt, {
            keysetId: from.keys.id,
         });

         // TODO: should validate preimage, but sometimes invoice is truly paid but preimage is null
         if (!isPaid) {
            throw new TransactionError('Melt failed');
         }
         // TODO: what happens if this fails
         // What if we add the mintquote to tx history and give option to retry if mintQuote is not paid
         const newProofs = await mintTokens(to, amountToMint, mintQuote);

         lockBalance();

         await addProofs([...newProofs, ...change]);
         if (opts.amount || opts.max) {
            // this means we were not give then proofs to melt, so we need to remove the proofs from the storage
            await removeProofs(proofsToMelt);
         }
         toastSwapSuccess(to, activeWallet, amountToMint);
      } catch (error) {
         toastSwapError(error);
      } finally {
         unlockBalance();
      }
   };

   /**
    * Swaps proofs from one mint to the active wallet.
    * @param {CashuWallet} from - to melt tokens from
    * @param {Object} opts - Options for the cross mint swap.
    * @param {Proof[]} [opts.proofs] - Specific proofs to melt. Mutually exclusive with `amount`.
    * @param {number} [opts.amount] - Amount to melt in sats. Mutually exclusive with `proofs`.
    * @param {boolean} [opts.max] - If true, melts all available proofs in the source wallet.
    */
   const swapToActiveWallet = async (from: CashuWallet, opts: CrossMintSwapOpts) => {
      if (!activeWallet) {
         throw new Error('No active wallet set');
      }
      if (from.mint.mintUrl === activeWallet.mint.mintUrl) {
         // TODO: consider other units
         if (!opts.proofs) {
            // could change this, just lazy
            throw new Error('this function requires proofs to be passed in');
         }

         return await swapToClaimProofs(from, opts.proofs);
      }
      return await crossMintSwap(from, activeWallet, opts);
   };

   /**
    * Swap proofs to prevent double spending
    * @param {CashuWallet} wallet - Wallet the proofs are from
    * @param {Proof[]} proofs - Proofs to claim
    */
   const swapToClaimProofs = async (wallet: CashuWallet, proofs: Proof[]) => {
      lockBalance();

      try {
         const swapRes = await wallet.receiveTokenEntry({
            proofs: proofs,
            mint: wallet.mint.mintUrl,
         });

         if (swapRes.proofsWithError) {
            if (swapRes.proofs) {
               addProofs(swapRes.proofs);
            }
            console.error('proofs came back with error', swapRes.proofsWithError);
            throw new Error(
               `Error claiming proofs. ${swapRes.proofsWithError.length} of ${swapRes.proofs?.length} failed`,
            );
         }

         addProofs(swapRes.proofs);

         const amountUsd = proofs.reduce((a, b) => a + b.amount, 0);
         toastSwapSuccess(wallet, activeWallet, amountUsd);
      } catch (error) {
         toastSwapError(error);
      } finally {
         unlockBalance();
      }
   };

   // TODO: how to make sure the `send` tokens don't get lost
   const getProofsToSend = async (amount: number, wallet: CashuWallet) => {
      const proofs = getProofsByAmount(amount, wallet.keys.id);

      if (!proofs || proofs.length === 0) {
         throw new InsufficientBalanceError(wallet.mint.mintUrl);
      }

      const { send, returnChange } = await wallet.send(amount, proofs, {
         keysetId: wallet.keys.id,
      });

      addProofs(returnChange);
      removeProofs(proofs);

      return send;
   };

   const createSendableToken = async (amount: number, wallet?: CashuWallet) => {
      if (!wallet) {
         if (!activeWallet) {
            throw new Error('No active wallet set');
         }
         wallet = activeWallet;
      }

      try {
         const proofs = await getProofsToSend(amount, wallet);

         const token = getEncodedToken({
            token: [{ proofs, mint: wallet.mint.mintUrl }],
            unit: 'usd',
         });

         dispatch(
            addTransaction({
               type: 'ecash',
               transaction: {
                  token: token,
                  amount: -amount,
                  unit: 'usd',
                  mint: wallet.mint.mintUrl,
                  status: TxStatus.PENDING,
                  date: new Date().toLocaleString(),
               },
            }),
         );

         return token;
      } catch (error) {
         toastSwapError(error);
      }
   };

   const getMeltQuote = async (invoice: string, wallet?: CashuWallet) => {
      if (!wallet) {
         if (!activeWallet) {
            throw new Error('No active wallet set');
         }
         wallet = activeWallet;
      }
      try {
         const quote = await wallet.getMeltQuote(invoice);

         const { amount, fee_reserve } = await quote;

         if (amount + fee_reserve > balanceByWallet[wallet.keys.id]) {
            throw new InsufficientBalanceError(
               wallet.mint.mintUrl,
               balanceByWallet[wallet.keys.id],
            );
         }

         return quote;
      } catch (error) {
         toastSwapError(error);
      }
   };

   const payInvoice = async (
      invoice: string,
      meltQuote?: MeltQuoteResponse,
      wallet?: CashuWallet,
   ) => {
      if (!wallet) {
         if (!activeWallet) {
            throw new Error('No active wallet set');
         }
         wallet = activeWallet;
      }
      if (!meltQuote) {
         meltQuote = await getMeltQuote(invoice, wallet);
         if (!meltQuote) {
            // getMeltQuote will handle the error gracefully
            return;
         }
      }

      lockBalance();

      try {
         const proofsToSend = await getProofsToSend(meltQuote.amount, wallet);

         const { preimage, isPaid, change } = await wallet.meltTokens(meltQuote, proofsToSend, {
            keysetId: wallet.keys.id,
         });

         // TODO: should validate preimage, but sometimes invoice is truly paid but preimage is null
         if (!isPaid) {
            throw new TransactionError('Melt failed');
         }

         addProofs(change);

         const feePaid = meltQuote.fee_reserve - change.reduce((acc, p) => acc + p.amount, 0);
         const feeMessage = feePaid > 0 ? ` + ${feePaid} sat${feePaid > 1 ? 's' : ''} fee` : '';

         dispatch(setSuccess(`Sent $${meltQuote.amount / 100}!`));
         return { preimage, amountUsd: meltQuote.amount, feePaid };
      } catch (error) {
         toastSwapError(error);
      } finally {
         unlockBalance();
      }
   };

   const requestMintInvoice = async (amount: number, wallet?: CashuWallet) => {
      if (!wallet) {
         if (!activeWallet) {
            throw new Error('No active wallet set');
         }
         wallet = activeWallet;
      }

      if (wallet.mint.mintUrl === reserveWallet?.mint.mintUrl) {
         addToast('Cannot mint to reserve wallet', 'error');
         throw new Error('Cannot mint to reserve wallet');
      }

      try {
         const { quote, request } = await getMintQuote(wallet, amount);

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

   const decodeToken = (token: string) => {
      try {
         const decodedToken = getDecodedToken(token);
         return decodedToken;
      } catch (e) {}
   };

   return {
      swapToActiveWallet,
      crossMintSwap,
      swapToClaimProofs,
      balance,
      getWallet,
      balanceByWallet,
      getMint,
      createSendableToken,
      getMeltQuote,
      payInvoice,
      requestMintInvoice,
      decodeToken,
   };
};
