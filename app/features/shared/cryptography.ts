import { useOpenSecret } from '@opensecret/react';
import { HDKey } from '@scure/bip32';
import { useMemo } from 'react';

/**
 * Hook that provides the OpenSecret cryptography functions.
 * Reference of the returned data is stable and doesn't change between renders.
 * @returns The OpenSecret cryptography functions.
 */
export const useCryptography = () => {
  const {
    // getPrivateKey returns a mnemonic (not a private key) that can derive the seed, so we rename it to getMnemonic
    getPrivateKey: getMnemonic,
    signMessage,
    getPublicKey,
    getPrivateKeyBytes,
  } = useOpenSecret();

  // All OpenSecret functions used here are stable and don't change between renders.
  // See: https://github.com/OpenSecretCloud/OpenSecret-SDK/blob/master/src/lib/main.tsx#L929
  return useMemo(() => {
    return {
      getMnemonic,
      signMessage,
      getPublicKey,
      getPrivateKeyBytes,
    };
  }, [getMnemonic, signMessage, getPublicKey, getPrivateKeyBytes]);
};

/**
 * Derives a public key from an xpub and a derivation path.
 * @param xpub - The base58-check encoded xpub.
 * @param derivationPath - The derivation path to derive the public key from.
 * @returns The derived public key as a hex string.
 */
export const derivePublicKey = (xpub: string, derivationPath: string) => {
  const hdKey = HDKey.fromExtendedKey(xpub);
  const childKey = hdKey.derive(derivationPath);
  return childKey.publicKey
    ? Array.from(childKey.publicKey)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    : '';
};
