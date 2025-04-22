import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { useMemo } from 'react';
import { create } from 'zustand';
import { sumProofs } from '~/lib/cashu';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
import { computeSHA256 } from '~/lib/sha256';
import { getSeedPhraseDerivationPath } from '../accounts/account-cryptography';
import { useCryptography } from './cryptography';
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

export type CashuCryptography = Pick<
  ReturnType<typeof useEncryption>,
  'encrypt' | 'decrypt'
> & {
  getSeed: () => Promise<Uint8Array>;
  getXpub: (derivationPath?: string) => Promise<string>;
  signMessage: (
    message: Uint8Array,
    derivationPath?: string,
  ) => Promise<string>;
};

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
  const { encrypt, decrypt } = useEncryption();
  const crypto = useCryptography();

  return useMemo(() => {
    const seedDerivationPath = getSeedPhraseDerivationPath('cashu', 12);

    const getSeed = async () => {
      const { seedPromise, setSeedPromise } = cashuSeedStore.getState();
      if (seedPromise) return seedPromise;

      const promise = crypto
        .getMnemonic({
          seed_phrase_derivation_path: seedDerivationPath,
        })
        .then((response) => mnemonicToSeedSync(response.mnemonic));

      setSeedPromise(promise);
      return promise;
    };

    const getXpub = async (derivationPath?: string) => {
      const seed = await getSeed();
      const hdKey = HDKey.fromMasterSeed(seed);

      if (derivationPath) {
        const childKey = hdKey.derive(derivationPath);
        return childKey.publicExtendedKey;
      }

      return hdKey.publicExtendedKey;
    };

    const signMessage = async (
      message: Uint8Array,
      derivationPath?: string,
    ) => {
      const { signature } = await crypto.signMessage(message, 'schnorr', {
        seed_phrase_derivation_path: seedDerivationPath,
        private_key_derivation_path: derivationPath,
      });
      return signature;
    };

    return { getSeed, signMessage, encrypt, decrypt, getXpub };
  }, [crypto, encrypt, decrypt]);
}

export function getTokenHash(token: Token | string): Promise<string> {
  const encodedToken =
    typeof token === 'string' ? token : getEncodedToken(token);
  return computeSHA256(encodedToken);
}
