import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { useMemo } from 'react';
import { create } from 'zustand';
import { sumProofs } from '~/lib/cashu';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
import { computeSHA256 } from '~/lib/sha256';
import { getSeedPhraseDerivationPath } from '../accounts/account-cryptography';
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

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => Number.parseInt(byte, 16)));
}

export type CashuCryptography = Pick<
  ReturnType<typeof useEncryption>,
  'encrypt' | 'decrypt'
> & { getSeed: () => Promise<Uint8Array> };

type CashuSeedStore = {
  seedPromise: ReturnType<
    ReturnType<typeof useCashuCryptography>['getSeed']
  > | null;
  setSeedPromise: (
    promise: ReturnType<ReturnType<typeof useCashuCryptography>['getSeed']>,
  ) => void;
};

// TODO: needs to be cleared when the user logs out
const cashuSeedStore = create<CashuSeedStore>((set) => ({
  seedPromise: null,
  setSeedPromise: (promise) => set({ seedPromise: promise }),
}));

export function useCashuCryptography(): CashuCryptography {
  const encryption = useEncryption();
  const { getPrivateKeyBytes, encrypt, decrypt } = encryption;

  return useMemo(() => {
    const getSeed = async () => {
      const { seedPromise, setSeedPromise } = cashuSeedStore.getState();
      if (seedPromise) return seedPromise;

      const promise = getPrivateKeyBytes({
        seed_phrase_derivation_path: getSeedPhraseDerivationPath('cashu', 12),
      }).then((response) => hexToUint8Array(response.private_key));

      setSeedPromise(promise);
      return promise;
    };

    return { getSeed, encrypt, decrypt };
  }, [getPrivateKeyBytes, encrypt, decrypt]);
}

export function getTokenHash(token: Token | string): Promise<string> {
  const encodedToken =
    typeof token === 'string' ? token : getEncodedToken(token);
  return computeSHA256(encodedToken);
}
