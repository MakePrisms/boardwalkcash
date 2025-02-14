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
import { sumProofsToAmount } from './proof';

export type GetCrossMintQuotesResult = {
  mintQuote: MintQuoteResponse;
  meltQuote: MeltQuoteResponse;
  amountToMint: number;
};

/**
 * Attempts to find valid quotes for cross-mint swaps by iteratively adjusting the amount
 * to account for fees. A valid quote is found when the total cost (amount + fees) is
 * less than or equal to the available proofs.
 *
 * @param from - Source wallet to melt proofs from
 * @param to - Destination wallet to mint new proofs to
 * @param numProofsAvailable - Total amount available in source proofs
 * @param maxAttempts - Maximum number of attempts to find valid quotes (default: 5)
 */
export const getCrossMintQuotes = async (
  from: CashuWallet,
  to: CashuWallet,
  numProofsAvailable: number,
  requestedAmount: number,
  maxAttempts = 5,
): Promise<GetCrossMintQuotesResult> => {
  // TODO: convert from.unit to to.unit and remove this check
  // will require an exchange rate
  if (from.unit !== to.unit) {
    throw new Error('Cannot swap between different units');
  }

  // Estimate initial fee based on Nutshell defaults to limit the number of attempts:
  // See: https://github.com/cashubtc/nutshell/blob/main/cashu/core/helpers.py#L53-L58
  const estimatedFee = Math.max(2, Math.floor(requestedAmount * 0.01));
  let amountToMint = requestedAmount;
  console.log('estimatedFee', estimatedFee);
  console.log('amountToMint', amountToMint);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (amountToMint < 1) {
      throw new Error('Token is too small to melt');
    }

    const mintQuote = await to.createMintQuote(amountToMint);
    const meltQuote = await from.createMeltQuote(mintQuote.request);
    const numProofsRequired = meltQuote.amount + meltQuote.fee_reserve;

    if (numProofsRequired > numProofsAvailable) {
      // Not enough proofs available, reduce amount and try again
      amountToMint -= numProofsRequired - numProofsAvailable;
      continue;
    }

    // We have enough proofs, check if we're trying to get exact amount
    if (requestedAmount === amountToMint) {
      // We want exactly requestedAmount after fees
      return { mintQuote, meltQuote, amountToMint };
    }

    // We're trying to get maximum amount possible
    return { mintQuote, meltQuote, amountToMint };
  }

  throw new Error(`Failed to find valid quotes after ${maxAttempts} attempts.`);
};

export const crossMintSwap = async (
  from: CashuWallet,
  to: CashuWallet,
  proofs: Proof[],
  quotes: GetCrossMintQuotesResult,
  options?: MintProofOptions & MeltProofOptions,
): Promise<{
  newProofs: Proof[];
  change: Proof[];
}> => {
  const { mintQuote, meltQuote, amountToMint } = quotes;

  const meltResponse = await from.meltProofs(meltQuote, proofs, options);
  // QUESTION: how would we recover if to.mintProofs fails? We would already have
  // melted the proofs, so we would need to try to mint again with the same mintQuote.
  const newProofs = await to.mintProofs(amountToMint, mintQuote.quote, options);

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
 * @returns The new proofs from the to wallet that can be claimed
 * and any change leftover from the swap
 */
export const swapProofsToWallet = async (
  from: CashuWallet,
  to: CashuWallet,
  proofs: Proof[],
  options?: MintProofOptions & MeltProofOptions & SwapOptions,
): Promise<{
  newProofs: Proof[];
  change: Proof[];
}> => {
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

    const { send, keep } = await to.swap(
      sumProofsToAmount(proofs),
      proofs,
      options,
    );
    return { newProofs: send, change: keep };
  }
  const quotes = await getCrossMintQuotes(
    from,
    to,
    sumProofsToAmount(proofs),
    sumProofsToAmount(proofs),
  );
  return await crossMintSwap(from, to, proofs, quotes, options);
};
