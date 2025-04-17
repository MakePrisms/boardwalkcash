import type { Token } from '@cashu/cashu-ts';
import { mnemonicToSeedSync } from '@scure/bip39';
import { useMemo } from 'react';
import { create } from 'zustand';
import { sumProofs } from '~/lib/cashu';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
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
  getLockingKey: () => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<string>;
};

type CashuKeyStore = {
  seedPromise: ReturnType<
    ReturnType<typeof useCashuCryptography>['getSeed']
  > | null;
  lockingKeyPromise: ReturnType<
    ReturnType<typeof useCashuCryptography>['getLockingKey']
  > | null;
  setSeedPromise: (
    promise: ReturnType<ReturnType<typeof useCashuCryptography>['getSeed']>,
  ) => void;
  setLockingKeyPromise: (
    promise: ReturnType<
      ReturnType<typeof useCashuCryptography>['getLockingKey']
    >,
  ) => void;
};

// TODO: needs to be cleared when the user logs out
const cashuKeyStore = create<CashuKeyStore>((set) => ({
  seedPromise: null,
  lockingKeyPromise: null,
  setSeedPromise: (promise) => set({ seedPromise: promise }),
  setLockingKeyPromise: (promise) => set({ lockingKeyPromise: promise }),
}));

export function useCashuCryptography(): CashuCryptography {
  const { encrypt, decrypt } = useEncryption();
  const crypto = useCryptography();

  return useMemo(() => {
    const seedDerivationPath = getSeedPhraseDerivationPath('cashu', 12);

    const getSeed = async () => {
      const { seedPromise, setSeedPromise } = cashuKeyStore.getState();
      if (seedPromise) return seedPromise;

      const promise = crypto
        .getMnemonic({
          seed_phrase_derivation_path: seedDerivationPath,
        })
        .then((response) => mnemonicToSeedSync(response.mnemonic));

      setSeedPromise(promise);
      return promise;
    };

    // TODO: should probably have a way to get many keys
    const getLockingKey = async () => {
      const { lockingKeyPromise, setLockingKeyPromise } =
        cashuKeyStore.getState();
      if (lockingKeyPromise) return lockingKeyPromise;

      const promise = crypto
        .getPublicKey('schnorr', {
          seed_phrase_derivation_path: seedDerivationPath,
        })
        .then((response) => `02${response.public_key}`); // Cashu uses 33 byte public keys

      setLockingKeyPromise(promise);
      return promise;
    };

    // TODO: if we can create various public keys, we need to specify which key to use to sign
    const signMessage = async (message: Uint8Array) => {
      const { signature } = await crypto.signMessage(message, 'schnorr', {
        seed_phrase_derivation_path: seedDerivationPath,
      });
      return signature;
    };

    return { getSeed, getLockingKey, signMessage, encrypt, decrypt };
  }, [crypto, encrypt, decrypt]);
}
