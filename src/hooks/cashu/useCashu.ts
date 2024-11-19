import {
   CashuWallet,
   MeltQuoteResponse,
   MintQuoteResponse,
   Proof,
   getDecodedToken,
   MintQuoteState,
   Token,
   getEncodedTokenV4,
} from '@cashu/cashu-ts';
import { useProofStorage } from './useProofStorage';
import { useNostrMintConnect } from '../nostr/useNostrMintConnect';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useToast } from '../util/useToast';
import { RootState, useAppDispatch } from '@/redux/store';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { resetStatus, setError, setSending, setSuccess } from '@/redux/slices/ActivitySlice';
import {
   CrossMintQuoteResult,
   Currency,
   GiftFee,
   InsufficientBalanceError,
   PayInvoiceResponse,
   ReserveError,
   TransactionError,
} from '@/types';
import { dissectToken, initializeWallet, proofsLockedTo } from '@/utils/cashu';
import useNotifications from '../boardwalk/useNotifications';
import { postTokenToDb } from '@/utils/appApiRequests';
import { formatUnit, getSymbolForUnit } from '@/utils/formatting';
import { useExchangeRate } from '../util/useExchangeRate';
import { useSelector } from 'react-redux';

type CrossMintSwapOpts = {
   proofs?: Proof[];
   amount?: number;
   max?: boolean;
   privkey?: string;
   giftId?: number;
};

export const useCashu = () => {
   const { activeWallet, reserveWallet, getWallet, getMint, addWalletFromMintUrl } =
      useCashuContext();
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
   const { requestDeposit, getReserveUri, createProofsFromReserve } = useNostrMintConnect();
   const { sendTokenAsNotification } = useNotifications();
   const { addToast, toastSwapSuccess, toastSwapError } = useToast();
   const { satsToUnit, unitToSats } = useExchangeRate();
   const user = useSelector((state: RootState) => state.user);

   const dispatch = useAppDispatch();

   const getMintQuote = async (wallet: CashuWallet, amount: number): Promise<MintQuoteResponse> => {
      if (reserveWallet?.keys.id === wallet.keys.id) {
         const invoice = await requestDeposit(getReserveUri(), amount);
         return {
            request: invoice.invoice,
            quote: 'reserve',
            state: MintQuoteState.UNPAID,
            expiry: 0,
         };
      } else {
         return wallet.createMintQuote(amount);
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
    * @param totalProofsAmount Sum of proofs to melt in fromWallet's unit
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

      console.log('getting cross mint quotes');
      console.log('fromWallet', fromWallet);
      console.log('toWallet', toWallet);
      console.log('totalProofsAmount', totalProofsAmount);

      while (attempts < maxAttempts) {
         attempts++;
         console.log('\n====-===============\n Attempt', attempts);

         /* convert amount to mint to toWallet's unit */
         const convertedAmountToMint = await convertToUnit(
            amountToMint,
            fromWallet.keys.unit,
            toWallet.keys.unit,
         );

         console.log('convertedAmountToMint', convertedAmountToMint);

         if (convertedAmountToMint < 1) {
            if (fromWallet.keys.unit === toWallet.keys.unit) {
               // Units are the same, no conversion needed
               throw new Error('Your balance is too low to withdrawl this amount.');
            } else if (
               fromWallet.keys.unit !== toWallet.keys.unit &&
               fromWallet.keys.unit === 'sat'
            ) {
               throw new Error(
                  'Amount to transfer is less than 1 cent. Try changing your active currency.',
               );
            } else {
               throw new Error('Something went wrong.');
            }
         }

         const mintQuote = await getMintQuote(toWallet, convertedAmountToMint);
         const meltQuote = await fromWallet.createMeltQuote(mintQuote.request);

         console.log('mintQuote', mintQuote);
         console.log('meltQuote', meltQuote);

         /* convert melt amount to fromWallet's unit */
         // const convertedMeltAmount = await convertToUnit(
         //    meltQuote.amount,
         //    fromWallet.keys.unit,
         //    toWallet.keys.unit,
         // );

         // console.log('convertedMeltAmount', convertedMeltAmount);

         if (meltQuote.amount + meltQuote.fee_reserve <= totalProofsAmount) {
            console.log('Found valid quotes');
            return { mintQuote, meltQuote, amountToMint: convertedAmountToMint };
         }
         const difference = meltQuote.amount + meltQuote.fee_reserve - totalProofsAmount;
         amountToMint = amountToMint - difference;
      }

      throw new Error('Failed to find valid quotes after maximum attempts.');
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
   const crossMintSwap = async (
      from: CashuWallet,
      to: CashuWallet,
      opts: CrossMintSwapOpts,
   ): Promise<boolean> => {
      if ((opts.max ? 1 : 0) + (opts.proofs ? 1 : 0) + (opts.amount ? 1 : 0) > 1) {
         throw new Error('Exactly one of max, proofs, or amount must be specified');
      }

      let proofsToMelt: Proof[] | null = [];

      if (opts.max) {
         proofsToMelt = getAllProofsByKeysetId(from.keys.id);
      } else if (opts.proofs) {
         proofsToMelt = opts.proofs;
      } else if (opts.amount) {
         proofsToMelt = getProofsByAmount(opts.amount, from.keys.id);
      }

      let success = false;
      let swappedToUnlock = false;

      try {
         if (from.mint.mintUrl.includes('test') || to.mint.mintUrl.includes('test')) {
            throw new Error('Cannot swap to/from test mints');
         }
         if (!proofsToMelt) {
            const tryingToSend =
               opts.amount || opts.proofs?.reduce((acc, p) => acc + p.amount, 0) || 0;
            throw new InsufficientBalanceError(
               from.keys.unit as Currency,
               balanceByWallet[from.keys.id],
               tryingToSend,
            );
         } else if (proofsToMelt.length === 0) {
            addToast('No proofs to melt', 'warning');
            return success;
         }

         const totalProofAmount = proofsToMelt.reduce((acc, p) => acc + p.amount, 0);

         console.log('total proof amount:', totalProofAmount);

         const { mintQuote, meltQuote, amountToMint } = await getCrossMintQuotes(
            from,
            to,
            totalProofAmount,
         );

         // need to swap for proofs that are not locked before melting
         if (opts.privkey) {
            try {
               proofsToMelt = await unlockProofs(from, proofsToMelt);
               swappedToUnlock = true;
            } catch (e) {
               toastSwapError(e);
               return success;
            }
         }

         const { preimage, isPaid, change } = await from
            .meltTokens(meltQuote, proofsToMelt, {
               keysetId: from.keys.id,
            })
            .catch(e => {
               if (swappedToUnlock) {
                  /* only adding because I'm assuming these are proofs being claimed */
                  addProofs(proofsToMelt || []);
                  alert(
                     `Lightning payment from ${from.mint.mintUrl} to ${to.mint.mintUrl} failed. In order to get your funds back, you will need to add ${from.mint.mintUrl} to your wallet. Go to settings -> "Mints" -> "Add a Mint" and add ${from.mint.mintUrl} to your wallet.`,
                  );
                  throw new Error(
                     `Lightning payment from ${from.mint.mintUrl} to ${to.mint.mintUrl} failed`,
                  );
               } else {
                  throw e;
               }
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
         if ((opts.amount || opts.max) && !swappedToUnlock) {
            // this means we were not give then proofs to melt, so we need to remove the proofs from the storage
            await removeProofs(proofsToMelt).catch(e => {
               console.error('error removing proofs', e);
            });
         }
         const newProofAmt = newProofs.reduce((a, b) => a + b.amount, 0);
         // const amountSwapped = await convertToUnit(amountToMint, from.keys.unit, to.keys.unit);
         // console.log('amountSwapped', amountSwapped, from.keys.unit, '--->', to.keys.unit);
         // toastSwapSuccess(to, activeWallet, amountSwapped);
         toastSwapSuccess(to, activeWallet, newProofAmt);
         success = true;

         dispatch(
            addTransaction({
               type: 'ecash',
               transaction: {
                  token: getEncodedTokenV4({
                     token: [{ proofs: newProofs, mint: to.mint.mintUrl }],
                  }),
                  amount: newProofAmt,
                  mint: to.mint.mintUrl,
                  date: new Date().toLocaleString(),
                  status: TxStatus.PAID,
                  unit: to.keys.unit as Currency,
                  gift: undefined,
                  giftId: opts?.giftId || null,
               },
            }),
         );
      } catch (error) {
         toastSwapError(error);
      } finally {
         unlockBalance();
      }
      return success;
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
         if (from.keys.unit !== activeWallet.keys.unit && !opts.proofs) {
            addToast('Cannot transfer funds from the same mint to a different currency', 'error');
            return;
         }

         // TODO: consider other units
         if (!opts.proofs) {
            // could change this, just lazy
            throw new Error('this function requires proofs to be passed in');
         }

         return await swapToClaimProofs(from, opts.proofs, {
            privkey: opts.privkey,
            giftId: opts.giftId,
         });
      }
      console.log('cross mint swap opts', opts);
      return await crossMintSwap(from, activeWallet, opts);
   };

   /**
    * Swap proofs to prevent double spending
    * @param {CashuWallet} wallet - Wallet the proofs are from
    * @param {Proof[]} proofs - Proofs to claim
    */
   const swapToClaimProofs = async (
      wallet: CashuWallet,
      proofs: Proof[],
      opts?: { privkey?: string; giftId?: number },
   ): Promise<boolean> => {
      lockBalance();
      let success = false;
      try {
         const newProofs = await wallet.receiveTokenEntry(
            {
               proofs: proofs,
               mint: wallet.mint.mintUrl,
            },
            { privkey: opts?.privkey },
         );

         addProofs(newProofs);

         const amountUnit = proofs.reduce((a, b) => a + b.amount, 0);

         const amountSwapped = await convertToUnit(amountUnit, wallet.keys.unit, wallet.keys.unit);

         toastSwapSuccess(wallet, activeWallet, amountSwapped);
         success = true;

         dispatch(
            addTransaction({
               type: 'ecash',
               transaction: {
                  token: getEncodedTokenV4({
                     token: [{ proofs: newProofs, mint: wallet.mint.mintUrl }],
                  }),
                  amount: amountUnit,
                  mint: wallet.mint.mintUrl,
                  date: new Date().toLocaleString(),
                  status: TxStatus.PAID,
                  unit: wallet.keys.unit as Currency,
                  gift: undefined,
                  giftId: opts?.giftId || null,
               },
            }),
         );
      } catch (error) {
         toastSwapError(error);
      } finally {
         unlockBalance();
      }
      return success;
   };

   /**
    *
    * @param token
    * @param privkey
    * @throws Error if mint does not support usd
    * @returns
    */
   const claimToken = async (token: Token, privkey?: string) => {
      let fromWallet = getWallet(token.token[0].proofs[0].id);
      if (!fromWallet) {
         const mintUrl = token.token[0].mint;
         fromWallet = await initializeWallet(mintUrl, { unit: token.unit });
      }
      return await swapToActiveWallet(fromWallet, { proofs: token.token[0].proofs, privkey });
   };

   /**
    * Gets exact denominations of proofs to send for a given amount and wallet.
    *
    * NOTE: `proofsToSend` are not removed from storage, so the calling function is expected to remove them after sending.
    * @param amount - Amount to send
    * @param wallet - Wallet to send from
    * @param {string} [opts.pubkey] - Optional pubkey to lock proofs to.
    * @returns proofs to send matching the amount. NOTE: proofsToSend are not removed from storage
    */
   const getProofsToSend = async (
      amount: number,
      wallet: CashuWallet,
      opts?: { pubkey?: string },
   ) => {
      const proofs = getProofsByAmount(amount, wallet.keys.id);

      if (!proofs || proofs.length === 0) {
         throw new InsufficientBalanceError(
            wallet.keys.unit as Currency,
            balanceByWallet[wallet.keys.id],
            amount,
         );
      }

      const { send, returnChange } = await wallet.send(amount, proofs, {
         keysetId: wallet.keys.id,
         pubkey: opts?.pubkey,
      });

      /* must remove first, because wallet.send might return the same proofs */
      await removeProofs(proofs);
      /* save all proofs, then calling function is expected to remove proofs */
      await addProofs([...send, ...returnChange]);

      return send;
   };

   /**
    * Removes proofs from local storage and adds a transaction to the history
    * @param amount
    * @param opts
    * @returns
    */
   const createSendableToken = async (
      amount: number,
      opts?: {
         wallet?: CashuWallet;
         pubkey?: string;
         giftId?: number;
         fee?: number;
         feeSplits?: GiftFee[];
      },
   ) => {
      let wallet: CashuWallet | undefined;
      if (!wallet) {
         if (!activeWallet) {
            throw new Error('No active wallet set');
         }
         wallet = activeWallet;
      }

      try {
         if (!hasSufficientBalance(amount + (opts?.fee || 0))) {
            throw new InsufficientBalanceError(
               wallet.keys.unit as Currency,
               balanceByWallet[wallet.keys.id],
               amount + (opts?.fee || 0),
            );
         }

         const proofs = await getProofsToSend(amount, wallet, {
            pubkey: opts?.pubkey,
         });

         /* create and send fee token to us if fee is set */
         if (opts?.fee) {
            if (!opts?.feeSplits || opts?.feeSplits.length === 0)
               throw new Error('feeSplits must be set when fee is set');
            const recipientPubkey = opts?.feeSplits[0].recipient;
            const feeProofs = await getProofsToSend(opts?.fee, wallet, {
               pubkey: '02' + recipientPubkey,
            });
            const feeToken = getEncodedTokenV4({
               token: [{ proofs: feeProofs, mint: wallet.mint.mintUrl }],
               unit: wallet.keys.unit,
            });
            if (feeToken) {
               const txid = await postTokenToDb(feeToken, opts?.giftId, true);
               await sendTokenAsNotification(feeToken, txid);
            }
            await removeProofs(feeProofs);
         }

         const token = getEncodedTokenV4({
            token: [{ proofs, mint: wallet.mint.mintUrl }],
            unit: wallet.keys.unit,
         });

         dispatch(
            addTransaction({
               type: 'ecash',
               transaction: {
                  token: token,
                  amount: -amount,
                  unit: wallet.keys.unit === 'usd' ? 'usd' : 'sat',
                  mint: wallet.mint.mintUrl,
                  status: TxStatus.PENDING,
                  date: new Date().toLocaleString(),
                  pubkey: opts?.pubkey,
                  giftId: opts?.giftId || null,
                  fee: opts?.fee,
               },
            }),
         );

         /* token can now be claimed in tx history, safe to remove proofs */
         await removeProofs(proofs);

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
         const quote = await wallet.createMeltQuote(invoice);

         const { amount, fee_reserve } = await quote;

         if (amount + fee_reserve > balanceByWallet[wallet.keys.id]) {
            throw new InsufficientBalanceError(
               wallet.keys.unit as Currency,
               balanceByWallet[wallet.keys.id],
               amount + fee_reserve,
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
   ): Promise<PayInvoiceResponse | undefined> => {
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
      dispatch(setSending('Sending...'));

      try {
         const proofsToSend = getProofsByAmount(
            meltQuote.amount + meltQuote.fee_reserve,
            wallet.keys.id,
         );

         if (!proofsToSend || proofsToSend.length === 0) {
            throw new InsufficientBalanceError(
               wallet.keys.unit as Currency,
               balanceByWallet[wallet.keys.id],
               meltQuote.amount + meltQuote.fee_reserve,
            );
         }

         const { preimage, isPaid, change } = await wallet.meltTokens(meltQuote, proofsToSend, {
            keysetId: wallet.keys.id,
         });

         await addProofs(change);

         // TODO: should validate preimage, but sometimes invoice is truly paid but preimage is null

         if (!isPaid) {
            const spent = await wallet.checkProofsSpent(proofsToSend);
            if (spent.length > 0) {
               /* not paid, but mint marked as spent, so remove the spent proofs */
               removeProofs(spent);
            }
            throw new TransactionError('Failed to pay invoice');
         } else {
            /* proofs are now spent, so remove them */
            await removeProofs(proofsToSend);
         }

         const feePaid = meltQuote.fee_reserve - change.reduce((acc, p) => acc + p.amount, 0);
         const feeMessage =
            feePaid > 0 ? ` + ${feePaid}${getSymbolForUnit(wallet.keys.unit as Currency)} fee` : '';

         dispatch(
            setSuccess(`Sent ${formatUnit(meltQuote.amount, wallet.keys.unit)} ${feeMessage}`),
         );
         return { preimage, amountUsd: meltQuote.amount, feePaid };
      } catch (error) {
         toastSwapError(error);
         dispatch(resetStatus());
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
            dispatch(setError(`Failed to fetch invoice from mint: ${error.message}`));
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

   const convertToUnit = async (amount: number, fromUnit: string, toUnit: string) => {
      if (fromUnit === toUnit) {
         return amount;
      } else if (fromUnit === 'usd') {
         console.log('converting usd to sats', amount);
         return await unitToSats(amount / 100, 'usd');
      } else if (fromUnit === 'sat') {
         console.log('converting sats to usd', amount);
         return await satsToUnit(amount, toUnit);
      } else {
         console.error('Invalid unit', fromUnit, toUnit);
         throw new Error('Invalid unit');
      }
   };

   const isTokenSpent = async (token: string | Token) => {
      const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;

      if (decodedToken.token.length !== 1) {
         throw new Error('Invalid token. Multiple token entries are not supported.');
      }

      const proofs = decodedToken.token[0].proofs;

      const wallet = getWallet(proofs[0].id);

      if (!wallet) {
         throw new Error('No wallet found for this token');
      }

      try {
         const spent = await wallet.checkProofsSpent(proofs);
         return spent.length > 0;
      } catch (e) {
         console.error(e);
         return false;
      }
   };

   const unlockProofs = async (wallet: CashuWallet, proofs: Proof[]) => {
      const pubkeys = proofsLockedTo(proofs);
      if (!pubkeys) {
         return proofs;
      }
      const privkey = window.localStorage.getItem('privkey');
      if (!privkey) {
         throw new Error('No private key found');
      }
      const newProofs = await wallet.receiveTokenEntry(
         {
            proofs,
            mint: wallet.mint.mintUrl,
         },
         { privkey },
      );
      return newProofs;
   };

   const hasSufficientBalance = (amountUsdCents: number) => {
      const activeKeysetId = activeWallet?.keys.id;
      if (!activeKeysetId) return false;
      return balanceByWallet[activeKeysetId] >= amountUsdCents;
   };

   /**
    * Claim a token to the mint that created it
    * @param token token to claim
    * @returns true if successful
    */
   const handleClaimToSourceMint = async (token: Token | string, opts?: { giftId?: number }) => {
      const { mintUrl, unit, proofs, keysetId, pubkeyLock } = dissectToken(token);

      let wallet = getWallet(keysetId);

      if (!wallet) {
         try {
            wallet = await initializeWallet(mintUrl, { unit });

            /* set active unit to undefined because we only want to add the wallet, not set it as active */
            await addWalletFromMintUrl(mintUrl, undefined);
         } catch (e) {
            console.error('Failed to initialize wallet', e);
            addToast(`Failed to initialize a wallet for ${mintUrl}.`, 'error');
            return false;
         }
      }
      const privkey = pubkeyLock ? user.privkey : undefined;
      try {
         return await swapToClaimProofs(wallet, proofs, { privkey, giftId: opts?.giftId });
      } catch (e) {
         console.error('Failed to initialize wallet', e);
         return false;
      }
   };

   /**
    * Claim a token to `activeWallet`
    * @param token token to claim
    * @returns true if successful
    */
   const handleClaimToActiveWallet = async (token: Token | string, opts?: { giftId?: number }) => {
      const { mintUrl, unit, proofs, keysetId, pubkeyLock } = dissectToken(token);

      let wallet = getWallet(keysetId);

      if (!wallet) {
         try {
            wallet = await initializeWallet(mintUrl, { unit });
         } catch (e) {
            console.error('Failed to initialize wallet', e);
            addToast(`Failed to initialize a wallet for ${mintUrl}.`, 'error');
            return false;
         }
      }

      let privkey = pubkeyLock ? user.privkey : undefined;

      return await swapToActiveWallet(wallet, {
         proofs,
         privkey,
         giftId: opts?.giftId,
      });
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
      getProofsToSend,
      getMeltQuote,
      payInvoice,
      requestMintInvoice,
      decodeToken,
      proofsLockedTo,
      isTokenSpent,
      claimToken,
      unlockProofs,
      handleClaimToSourceMint,
      handleClaimToActiveWallet,
   };
};
