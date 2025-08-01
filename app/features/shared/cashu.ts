import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { useMemo } from 'react';
import { create } from 'zustand';
import { sumProofs } from '~/lib/cashu';
import { buildMintValidator, getCashuWallet } from '~/lib/cashu';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';
import { computeSHA256 } from '~/lib/sha256';
import { getSeedPhraseDerivationPath } from '../accounts/account-cryptography';
import { useCashuAuthStore } from './cashu-auth';
import { useCryptography } from './cryptography';
import { useEncryption } from './encryption';

// Cashu-specific derivation path with hardnened indexes to derive public keys for
// locking mint quotes and proofs. 129372 is UTF-8 for 🥜 (see NUT-13) and the other
// 2 indexes are the coin type (0) and account (0) which can be changed to derive
// different keys if needed. This path is "proprietary" and not part of any standard.
// The index values are unimportant as long as they are hardened and remain constant.
// DO NOT CHANGE THIS VALUE WITHOUT UPDATING USER'S XPUB IN THE DATABASE. IF THIS
// IS NOT DONE, THEN WE WILL CREATE THE WRONG DERIVATION PATH WHEN GETTING PRIVATE KEYS.
export const BASE_CASHU_LOCKING_DERIVATION_PATH = "m/129372'/0'/0'";

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
  getPrivateKey: (derivationPath?: string) => Promise<string>;
};

type CashuSeedStore = {
  seedPromise: ReturnType<
    ReturnType<typeof useCashuCryptography>['getSeed']
  > | null;
  setSeedPromise: (
    promise: ReturnType<ReturnType<typeof useCashuCryptography>['getSeed']>,
  ) => void;
  clear: () => void;
};

export const cashuSeedStore = create<CashuSeedStore>((set) => ({
  seedPromise: null,
  setSeedPromise: (promise) => set({ seedPromise: promise }),
  clear: () => set({ seedPromise: null }),
}));

/**
 * Hook that provides the Cashu cryptography functions.
 * Reference of the returned data is stable and doesn't change between renders.
 * @returns The Cashu cryptography functions.
 */
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

    const getPrivateKey = async (derivationPath?: string) => {
      return crypto
        .getPrivateKeyBytes({
          seed_phrase_derivation_path: seedDerivationPath,
          private_key_derivation_path: derivationPath,
        })
        .then((response) => response.private_key);
    };

    return { getSeed, getPrivateKey, encrypt, decrypt, getXpub };
  }, [crypto, encrypt, decrypt]);
}

export function getTokenHash(token: Token | string): Promise<string> {
  const encodedToken =
    typeof token === 'string' ? token : getEncodedToken(token);
  return computeSHA256(encodedToken);
}

export const cashuMintValidator = buildMintValidator({
  requiredNuts: [4, 5, 7, 8, 9, 10, 11, 12, 17, 20] as const,
  requiredWebSocketCommands: ['bolt11_melt_quote', 'proof_state'] as const,
});

export function getCashuWalletWithAuth(
  mintUrl: string,
  options?: Omit<Parameters<typeof getCashuWallet>[1], 'unit'>,
) {
  return getCashuWallet(mintUrl, {
    getClearAuthToken: async () => {
      const token = await useCashuAuthStore
        .getState()
        .getClearAuthTokenWithRefresh(mintUrl);
      if (token === null) {
        throw new Error(
          `Authentication required for mint ${mintUrl}. Please authenticate when prompted.`,
        );
      }
      return token;
    },
    getAndConsumeBlindAuthToken: async () => {
      return await useCashuAuthStore
        .getState()
        .getAndConsumeBlindAuthToken(mintUrl);
    },
    ...options,
  });
}
