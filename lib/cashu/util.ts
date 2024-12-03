import { CashuMint, CashuWallet } from '@cashu/cashu-ts';

export const initializeCashuWallet = async (mintUrl: string, unit: string) => {
  const wallet = new CashuWallet(new CashuMint(mintUrl), { unit });

  await wallet.loadMint();

  return wallet;
};
