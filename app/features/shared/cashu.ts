import type { Token } from '@cashu/cashu-ts';
import { useMemo } from 'react';
import { create } from 'zustand';
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

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => Number.parseInt(byte, 16)));
}

const derivationPathIndexes: Record<string, number> = {
  cashu: 0,
};

/**
 * Get the derivation path for a given account type based on the BIP-85 standard
 * in the format `m/83696968'/39'/0'/${words}'/${index}'`
 * - `83696968` defines the purpose and is 'SEED' in ascii.
 * - `39` denotes the application is BIP-39 (mnemonic seed words)
 * - `0` denotes the language of the seed words is English
 * - `words` denotes the number of words in the seed phrase (12 or 24)
 * - `index` denotes the index for unique seed phrases
 */
function getSeedPhraseDerivationPath(accountType: 'cashu', words: 12 | 24) {
  const index = derivationPathIndexes[accountType];
  return `m/83696968'/39'/0'/${words}'/${index}'`;
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
