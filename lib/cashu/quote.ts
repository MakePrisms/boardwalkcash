import type { CashuWallet } from '@cashu/cashu-ts';

export const getCrossMintQuotes = async (
  fromWallet: CashuWallet,
  toWallet: CashuWallet,
  totalProofsAmount: number,
  maxAttempts = 5,
) => {
  let attempts = 0;
  let amountToMint = totalProofsAmount;

  while (attempts < maxAttempts) {
    attempts++;

    // TODO: convert fromWallet.unit to toWallet.unit
    if (fromWallet.unit !== toWallet.unit) {
      throw new Error('Wallets have different units');
    }
    const convertedAmountToMint = amountToMint;

    if (convertedAmountToMint < 1) {
      throw new Error('Token is too small to melt');
    }

    const mintQuote = await toWallet.createMintQuote(convertedAmountToMint);
    const meltQuote = await fromWallet.createMeltQuote(mintQuote.request);

    if (meltQuote.amount + meltQuote.fee_reserve <= totalProofsAmount) {
      console.log('Found valid quotes');
      return { mintQuote, meltQuote, amountToMint: convertedAmountToMint };
    }
    const difference =
      meltQuote.amount + meltQuote.fee_reserve - totalProofsAmount;
    amountToMint = amountToMint - difference;
  }

  throw new Error('Failed to find valid quotes after maximum attempts.');
};
