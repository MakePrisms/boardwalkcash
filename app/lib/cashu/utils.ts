import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { decodeBolt11 } from '~/lib/bolt11';

/**
 * Check if a mint is a test mint by checking the network of the mint quote
 * @param mintUrl - The URL of the mint
 * @returns True if the mint is not on mainnet
 */
export const isTestMint = async (mintUrl: string): Promise<boolean> => {
  if (mintUrl.includes('test')) {
    // The testnut.cashu.space mint is a test mint, but returns a mainnet invoice
    return true;
  }
  const wallet = new CashuWallet(new CashuMint(mintUrl));
  const { request: bolt11 } = await wallet.createMintQuote(1);
  const { network } = decodeBolt11(bolt11);
  return network !== 'bitcoin';
};
