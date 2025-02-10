import { CashuMint, CashuWallet, type GetInfoResponse } from '@cashu/cashu-ts';
import { decodeBolt11 } from '~/lib/bolt11';

const knownTestMints = [
  'https://testnut.cashu.space',
  'https://nofees.testnut.cashu.space',
];

/**
 * Check if a mint is a test mint by checking the network of the mint quote
 * and also checking if the mint is in the list of known test mints
 *
 * Known test mints:
 * - https://testnut.cashu.space
 * - https://nofees.testnut.cashu.space
 *
 * @param mintUrl - The URL of the mint
 * @returns True if the mint is not on mainnet
 */
export const isTestMint = async (mintUrl: string): Promise<boolean> => {
  // Normalize URL by removing trailing slash and converting to lowercase
  const normalizedUrl = mintUrl.toLowerCase().replace(/\/+$/, '');
  if (knownTestMints.includes(normalizedUrl)) {
    return true;
  }
  const wallet = new CashuWallet(new CashuMint(mintUrl));
  const { request: bolt11 } = await wallet.createMintQuote(1);
  const { network } = decodeBolt11(bolt11);
  return network !== 'bitcoin';
};

export const getMintInfo = async (
  mintUrl: string,
): Promise<GetInfoResponse> => {
  return new CashuMint(mintUrl).getInfo();
};
