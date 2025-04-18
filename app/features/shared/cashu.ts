import type { Token } from '@cashu/cashu-ts';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, hexToBytes } from '@noble/hashes/utils';
import { createBase58check } from '@scure/base';
import { HDKey } from '@scure/bip32';
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

// Bitcoin mainnet versions
const BITCOIN_VERSIONS = { private: 0x0488ade4, public: 0x0488b21e };

// Helper function to convert a 4-byte number to Uint8Array
function toU32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = (n >>> 24) & 0xff;
  buf[1] = (n >>> 16) & 0xff;
  buf[2] = (n >>> 8) & 0xff;
  buf[3] = n & 0xff;
  return buf;
}

// Convert a hex public key string to a base58check-encoded xpub string
function hexToBase58Xpub(pubKeyHex: string): string {
  const base58check = createBase58check(sha256);

  // Ensure we have a compressed public key format (33 bytes)
  const pubKey =
    pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')
      ? hexToBytes(pubKeyHex)
      : hexToBytes(`02${pubKeyHex}`);

  // Create dummy values for BIP32 parameters
  const version = BITCOIN_VERSIONS.public;
  const depth = 0;
  const parentFingerprint = 0;
  const index = 0;

  // Generate a dummy chain code (32 bytes of zeros)
  const chainCode = new Uint8Array(32);

  // Serialize according to BIP32 specification
  // version(4) || depth(1) || fingerprint(4) || index(4) || chain(32) || key(33)
  const serialized = concatBytes(
    toU32(version),
    new Uint8Array([depth]),
    toU32(parentFingerprint),
    toU32(index),
    chainCode,
    pubKey,
  );

  // Encode with base58check
  return base58check.encode(serialized);
}

export type CashuCryptography = Pick<
  ReturnType<typeof useEncryption>,
  'encrypt' | 'decrypt'
> & {
  getSeed: () => Promise<Uint8Array>;
  getLockingKey: () => Promise<string>;
  getLockingXpub: () => Promise<string>;
  signMessage: (
    message: Uint8Array,
    derivationPath?: string,
  ) => Promise<string>;
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

    const getLockingXpub = async () => {
      return crypto
        .getPublicKey('schnorr', {
          seed_phrase_derivation_path: seedDerivationPath,
        })
        .then((response) => hexToBase58Xpub(response.public_key));
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

    return {
      getSeed,
      getLockingKey,
      getLockingXpub,
      signMessage,
      encrypt,
      decrypt,
    };
  }, [crypto, encrypt, decrypt]);
}

export function derivePublicKey(xpub: string, derivationPath: string) {
  const hdKey = HDKey.fromExtendedKey(xpub);
  const childKey = hdKey.derive(derivationPath);
  return childKey.publicKey
    ? Array.from(childKey.publicKey)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    : '';
}
