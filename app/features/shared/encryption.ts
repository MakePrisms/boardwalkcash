import { useOpenSecret } from '@opensecret/react';
import { decode, encode } from '@stablelib/base64';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { hexToUint8Array } from '~/lib/utils';

// 10111099 is 'enc' (for encryption) in ascii
const encryptionKeyDerivationPath = `m/10111099'/0'`;

export const useEncryptionKey = () => {
  const { getPrivateKeyBytes } = useOpenSecret();

  const { data } = useSuspenseQuery({
    queryKey: ['encryption-key'],
    queryFn: () =>
      getPrivateKeyBytes({
        private_key_derivation_path: encryptionKeyDerivationPath,
      }).then((response) => {
        // Convert hex string to Uint8Array
        const keyBytes = hexToUint8Array(response.private_key);

        // Import the key for AES-GCM
        return crypto.subtle.importKey(
          'raw',
          keyBytes,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt'],
        );
      }),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data;
};

/**
 * This function preprocesses the data to preserve the type information for dates.
 * This is needed before serializing the data to a string because JSON.stringify replaces Date with string before replacer function is called.
 */
function preprocessData(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) {
    return { __type: 'Date', value: obj.toISOString() };
  }

  if (Array.isArray(obj)) {
    return obj.map(preprocessData);
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    result[key] = preprocessData(obj[key as keyof typeof obj]);
  }
  return result;
}

type Encryption = {
  /**
   * Encrypts arbitrary data object using the user's data encryption key
   * @param data - Data to be encrypted
   * @returns A promise resolving to the encrypted base64 encoded nonce and data
   *
   * @description
   * Encrypts data with AES-256-GCM. A random nonce is generated for each encryption operation and included in the result.
   */
  encrypt: <T = unknown>(data: T) => Promise<string>;
  /**
   * Decrypts data that was previously encrypted with the user's encryption key (using 'encrypt' method)
   * @param data - Base64-encoded encrypted data string
   * @returns A promise resolving to the decrypted data
   *
   * @description
   * Decrypts the data by decoding the base64 encoded string, extracting nonce and then decrypting the data with the nonce and the encryption key.
   */
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

/**
 * Hook that provides the encryption functions.
 * Reference of the returned data is stable and doesn't change between renders.
 * Technical details:
 * - Encrypts data with AES-256-GCM
 * - A random nonce is generated for each encryption operation (included in the result)
 * - The encrypted data format includes the nonce and is base64-encoded
 * @returns The encryption functions.
 */
export const useEncryption = (): Encryption => {
  const encryptionKey = useEncryptionKey();

  return useMemo(() => {
    return {
      encrypt: async <T = unknown>(data: T) => {
        const preprocessedData = preprocessData(data);
        const serialized = JSON.stringify(preprocessedData, (_, value) => {
          if (value === undefined) {
            return { __type: 'undefined' };
          }
          if (typeof value === 'number' && !Number.isFinite(value)) {
            return { __type: 'number', value: value.toString() };
          }
          return value;
        });

        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(serialized);

        // Generate random 12-byte nonce for AES-GCM
        const nonce = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt the data
        const encryptedBytes = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: nonce },
          encryptionKey,
          dataBytes,
        );

        // Combine nonce and encrypted data
        const result = new Uint8Array(nonce.length + encryptedBytes.byteLength);
        result.set(nonce);
        result.set(new Uint8Array(encryptedBytes), nonce.length);

        // Return base64-encoded result
        return encode(result);
      },
      decrypt: async <T = unknown>(data: string) => {
        // Decode base64 data
        const encryptedBytes = decode(data);

        // Extract nonce (first 12 bytes) and ciphertext
        const nonceLength = 12;
        const nonce = encryptedBytes.slice(0, nonceLength);
        const ciphertext = encryptedBytes.slice(nonceLength);

        // Decrypt the data
        const decryptedBytes = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: nonce },
          encryptionKey,
          ciphertext,
        );

        const decoder = new TextDecoder();
        const decryptedString = decoder.decode(decryptedBytes);

        return JSON.parse(decryptedString, (_, value) => {
          if (value && typeof value === 'object' && '__type' in value) {
            switch (value.__type) {
              case 'Date':
                return new Date(value.value);
              case 'undefined':
                return undefined;
              case 'number':
                return Number(value.value); // This handles Infinity, -Infinity, NaN
            }
          }
          return value;
        }) as T;
      },
    };
  }, [encryptionKey]);
};
