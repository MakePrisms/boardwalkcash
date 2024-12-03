import type { CashuWallet, Proof } from '@cashu/cashu-ts';
import { payInvoice } from './lightningCli';

export const getNewProofsToUse = async (
  wallet: CashuWallet,
  amount: number,
): Promise<Proof[]> => {
  const mintQuote = await wallet.createMintQuote(amount);

  await payInvoice(mintQuote.request, { nodeNumber: 1 });

  return await wallet.mintProofs(amount, mintQuote.quote);
};
