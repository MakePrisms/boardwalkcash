import type { Token } from '@cashu/cashu-ts';
import { sumProofs } from '~/lib/cashu';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
import { useEncryption } from './encryption';

function getCurrencyAndUnitFromToken(token: Token): {
  currency: Currency;
  unit: CurrencyUnit;
  formatUnit: 'sat' | 'usd';
} {
  if (token.unit === 'sat') {
    return { currency: 'BTC', unit: 'sat', formatUnit: 'sat' };
  }
  if (token.unit === 'usd') {
    return { currency: 'USD', unit: 'cent', formatUnit: 'usd' };
  }
  throw new Error(`Invalid token unit ${token.unit}`);
}

export function tokenToMoney(token: Token): Money {
  const { currency, unit } = getCurrencyAndUnitFromToken(token);
  const amount = sumProofs(token.proofs);
  return new Money<Currency>({
    amount,
    currency,
    unit,
  });
}

// TODO: this was written by Claude, check if it's correct
function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => Number.parseInt(byte, 16)));
}

export type CashuCryptography = Pick<
  ReturnType<typeof useEncryption>,
  'encryptData' | 'decryptData'
> & { getSeed: (derivationPath: string) => Promise<Uint8Array> };

export function useCashuCryptography(): CashuCryptography {
  const { getPrivateKeyBytes, encryptData, decryptData } = useEncryption();

  const getSeed = async (derivationPath: string): Promise<Uint8Array> => {
    const response = await getPrivateKeyBytes(derivationPath);
    return hexToUint8Array(response.private_key);
  };

  return { getSeed, encryptData, decryptData };
}
