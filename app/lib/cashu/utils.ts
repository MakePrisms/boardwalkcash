import {
  CashuMint,
  CashuWallet,
  type MintKeyset,
  type Token,
} from '@cashu/cashu-ts';
import type { DistributedOmit } from 'type-fest';
import { decodeBolt11 } from '~/lib/bolt11';
import type { Currency, CurrencyUnit } from '../money';
import type { MintInfo } from './types';

const knownTestMints = [
  'https://testnut.cashu.space',
  'https://nofees.testnut.cashu.space',
];

const currencyToUnit: {
  [K in Currency]: CurrencyUnit<K>;
} = {
  BTC: 'sat',
  USD: 'cent',
};

export const getCashuUnit = (currency: Currency) => {
  return currencyToUnit[currency];
};

export const getCashuUnitFromToken = (token: Token) => {
  switch (token.unit) {
    case 'sat':
      return 'sat';
    case 'usd':
      return 'cent';
    default:
      throw new Error(`Unknown token unit: ${token.unit}`);
  }
};

export const getCashuWallet = (
  mintUrl: string,
  options: DistributedOmit<
    ConstructorParameters<typeof CashuWallet>[1],
    'unit'
  > & {
    unit?: CurrencyUnit;
  } = {},
) => {
  const { unit, ...rest } = options;
  // Cashu calls the unit 'usd' even though the amount is in cents.
  // To avoid this confusion we use 'cent' everywhere and then here we switch the value to 'usd' before creating the Cashu wallet.
  const cashuUnit = unit === 'cent' ? 'usd' : unit;
  return new CashuWallet(new CashuMint(mintUrl), {
    ...rest,
    unit: cashuUnit,
  });
};

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
export const checkIsTestMint = async (mintUrl: string): Promise<boolean> => {
  // Normalize URL by removing trailing slash and converting to lowercase
  const normalizedUrl = mintUrl.toLowerCase().replace(/\/+$/, '');
  if (knownTestMints.includes(normalizedUrl)) {
    return true;
  }
  const wallet = getCashuWallet(mintUrl);
  const { request: bolt11 } = await wallet.createMintQuote(1);
  const { network } = decodeBolt11(bolt11);
  return network !== 'bitcoin';
};

export const getMintInfo = async (mintUrl: string): Promise<MintInfo> => {
  return getCashuWallet(mintUrl).getMintInfo();
};

export const getKeysets = async (
  mintUrl: string,
  unit: CurrencyUnit,
): Promise<Array<MintKeyset>> => {
  return getCashuWallet(mintUrl, { unit }).getKeySets();
};
