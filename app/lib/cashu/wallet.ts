import type {
  CashuWallet,
  MeltQuoteResponse,
  MintQuoteResponse,
  Proof,
} from '@cashu/cashu-ts';
import type {
  MeltProofOptions,
  MintProofOptions,
  SwapOptions,
} from '@cashu/cashu-ts';
import { sumProofs } from './proof';

type GetCrossMintQuotesResult = {
  /** Mint quote for the destination wallet */
  mintQuote: MintQuoteResponse;
  /** Melt quote for the source wallet */
  meltQuote: MeltQuoteResponse;
};

type SwapProofsResult = {
  /** New proofs from the destination wallet that can be claimed */
  newProofs: Proof[];
  /** Change leftover from the swap */
  change: Proof[];
};

/**
 * Attempts to find valid quotes for cross-mint swaps by iteratively adjusting the amount
 * to account for fees. A valid quote is found when the total cost (amount + fees) is
 * less than or equal to the available proofs.
 *
 * @param from - Source wallet to melt proofs from
 * @param to - Destination wallet to mint new proofs to
 * @param proofsAvailable - Total amount available in source proofs
 * @param requestedAmount - The amount of proofs to mint
 * @param errorTolerance - Maximum difference between estimated and actual fee reserve (default: 2)
 * @param maxAttempts - Maximum number of attempts to find valid quotes (default: 5)
 */
export const getCrossMintQuotes = async (
  from: CashuWallet,
  to: CashuWallet,
  proofsAvailable: number,
  requestedAmount: number,
  errorTolerance = 2,
  maxAttempts = 5,
): Promise<GetCrossMintQuotesResult> => {
  if (requestedAmount > proofsAvailable) {
    throw new Error(
      `Requested amount is greater than available proofs: ${requestedAmount} > ${proofsAvailable}`,
    );
  }

  // TODO: convert from.unit to to.unit and remove this check
  // will require an exchange rate
  if (from.unit !== to.unit) {
    throw new Error('Cannot swap between different units');
  }

  // Estimate initial fee based on Nutshell defaults to limit the number of attempts:
  // See: https://github.com/cashubtc/nutshell/blob/main/cashu/core/helpers.py#L53-L58
  const estimatedFeeReserve = Math.max(2, Math.floor(requestedAmount * 0.1));
  const estimatedTotalRequired = requestedAmount + estimatedFeeReserve;

  if (estimatedTotalRequired > proofsAvailable) {
    // amount + fee is estimated to be greater than available proofs
    // so we try to melt the max amount possible
    let amountToMint = proofsAvailable - estimatedFeeReserve;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const mintQuote = await to.createMintQuote(amountToMint);
      const meltQuote = await from.createMeltQuote(mintQuote.request);
      const proofsRequired = meltQuote.amount + meltQuote.fee_reserve;
      const diff = proofsRequired - proofsAvailable;

      if (attempt === 0 && Math.abs(diff) > errorTolerance) {
        // correct for bad estimation if error is greater than errorTolerance
        amountToMint -= diff;
        continue;
      }

      if (proofsRequired <= proofsAvailable) {
        return { mintQuote, meltQuote };
      }

      // Reduce amount and try again
      amountToMint -= diff;
    }

    throw new Error(
      `Failed to find valid quotes after ${maxAttempts} attempts.`,
    );
  }

  // We think we have enough proofs to mint the requested amount, so we try to get exactly that amount
  // but if we can't, we adjust the amount to mint to get as close as possible
  let amountToMint = requestedAmount;

  // QUESTION: Should we break the following into its own function (getExactCrossMintQuotes)
  // and then remove the loop below and error if we can't get the exact amount?
  // This way we can choose if we want to melt the max amount for when we want to
  // claim as much as possible or drain an account's balance. Then we can also
  // choose that we want to make sure the requested amount to send is exactly what we want.

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const mintQuote = await to.createMintQuote(amountToMint);
    const meltQuote = await from.createMeltQuote(mintQuote.request);
    const proofsRequired = meltQuote.amount + meltQuote.fee_reserve;

    if (proofsRequired <= proofsAvailable) {
      return { mintQuote, meltQuote };
    }

    const diff = proofsRequired - proofsAvailable;
    amountToMint -= diff;
  }

  throw new Error(`Failed to find valid quotes after ${maxAttempts} attempts.`);
};

/**
 * Performs a cross-mint swap using the provided quotes.
 *
 * @param from - Source wallet to melt proofs from
 * @param to - Destination wallet to mint new proofs to
 * @param proofs - Proofs to swap
 * @param quotes - Mint and melt quotes for the swap
 * @param options - Optional mint and melt options
 * @returns The new proofs from the to wallet that can be claimed
 * and any change leftover from the swap
 */
export const crossMintSwap = async (
  from: CashuWallet,
  to: CashuWallet,
  proofs: Proof[],
  quotes: GetCrossMintQuotesResult,
  options?: MintProofOptions & MeltProofOptions,
): Promise<SwapProofsResult> => {
  const { mintQuote, meltQuote } = quotes;

  const weNeed = meltQuote.amount + meltQuote.fee_reserve;
  const weHave = sumProofs(proofs);
  if (weNeed > weHave) {
    throw new Error(
      'Melt quote amount + fee reserve is greater than the sum of the proofs',
    );
  }

  // TODO: what happens if proofs exceed the melt quote amount? We should get change back for the full excess amount
  const meltResponse = await from.meltProofs(meltQuote, proofs, options);

  // QUESTION: how would we recover if to.mintProofs fails? We would already have
  // melted the proofs, so we would need to try to mint again with the same mintQuote.
  const newProofs = await to.mintProofs(
    meltQuote.amount,
    mintQuote.quote,
    options,
  );

  return {
    newProofs,
    change: meltResponse.change,
  };
};

/**
 * Swaps proofs by performing a cross-mint swap if the source and destination wallets are different.
 * If the source and destination wallets are the same, the proofs are claimed to the same wallet.
 *
 * @param from - Source wallet of proofs to swap
 * @param to - Destination wallet to swap proofs to. This can be the same as the source wallet.
 * @param proofs - Proofs to swap
 * @param options - Optional mint and melt options
 * @returns The new proofs from the destination wallet that can be claimed
 * and any change leftover from the swap
 */
export const swapProofsToWallet = async (
  from: CashuWallet,
  to: CashuWallet,
  proofs: Proof[],
  options?: MintProofOptions & MeltProofOptions & SwapOptions,
): Promise<SwapProofsResult> => {
  const sameMint = from.mint.mintUrl === to.mint.mintUrl;
  const sameUnit = from.unit === to.unit;

  if (sameMint) {
    if (!sameUnit) {
      // this is a limitation of the current mint implementations
      // fixed in nutshell v16.3 https://github.com/cashubtc/nutshell/pull/651
      // TODO: check status of this on major mints
      throw new Error(
        'Cannot transfer funds from the same mint to a different unit',
      );
    }

    const { send, keep } = await to.swap(sumProofs(proofs), proofs, options);
    return { newProofs: send, change: keep };
  }

  const totalProofAmount = sumProofs(proofs);
  const quotes = await getCrossMintQuotes(
    from,
    to,
    totalProofAmount,
    totalProofAmount,
  );

  return await crossMintSwap(from, to, proofs, quotes, options);
};
