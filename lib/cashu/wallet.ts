// QUESTION: how should we do type import? could have them all in a single import statement
import type { CashuWallet, MeltQuoteResponse, Proof } from '@cashu/cashu-ts';
import { MeltQuoteState } from '@cashu/cashu-ts';
import { sumProofs } from '@cashu/cashu-ts/dist/lib/es5/utils';
import { getCrossMintQuotes } from './quote';
import type {
  CrossMintSwapResult,
  MeltProofOptions,
  MintProofOptions,
  SwapOptions,
} from './types';

export const crossMintSwap = async (
  from: CashuWallet,
  to: CashuWallet,
  proofs: Proof[],
  options?: MintProofOptions & MeltProofOptions,
): Promise<CrossMintSwapResult> => {
  // TODO: come up with a better way to check for test mints
  if (from.mint.mintUrl.includes('test') || to.mint.mintUrl.includes('test')) {
    throw new Error('Cannot swap to/from test mints');
  }
  const totalProofAmount = sumProofs(proofs);

  const { mintQuote, meltQuote, amountToMint } = await getCrossMintQuotes(
    from,
    to,
    totalProofAmount,
  );

  const meltResponse = await from.meltProofs(meltQuote, proofs, options);

  // TODO: should instead validate preimage, but sometimes invoice is truly paid but preimage is null
  if (meltResponse.quote.state !== MeltQuoteState.PAID) {
    throw new Error('Melt failed');
  }

  const newProofs = await to.mintProofs(amountToMint, mintQuote.quote, options);

  return {
    proofs: newProofs,
    change: meltResponse.change,
  };
};

export const swapProofsToWallet = async (
  from: CashuWallet,
  to: CashuWallet,
  proofs: Proof[],
  options?: MintProofOptions & MeltProofOptions & SwapOptions,
) => {
  if (from.mint.mintUrl === to.mint.mintUrl) {
    if (from.unit !== to.unit) {
      // this is a limitation of the current mint implementations
      // fixed in nutshell v16.3 https://github.com/cashubtc/nutshell/pull/651
      throw new Error(
        'Cannot transfer funds from the same mint to a different unit',
      );
    }

    return await to.swap(sumProofs(proofs), proofs, options);
  }
  return await crossMintSwap(from, to, proofs, options);
};

export const payInvoice = async (
  wallet: CashuWallet,
  invoice: string,
  proofs: Proof[],
  meltQuote?: MeltQuoteResponse,
  options?: MeltProofOptions,
) => {
  const quote = meltQuote ?? (await wallet.createMeltQuote(invoice));

  return await wallet.meltProofs(quote, proofs, options);
};
