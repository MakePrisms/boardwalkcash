import { useOpenSecret } from '@opensecret/react';
import { useMemo } from 'react';

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

export const useEncryption = () => {
  const { getPrivateKeyBytes, encryptData, decryptData } = useOpenSecret();

  return useMemo(() => {
    return {
      getPrivateKeyBytes,
      encrypt: async <T = unknown>(
        data: T,
        derivationPath?: string,
      ): Promise<string> => {
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
        const response = await encryptData(serialized, derivationPath);
        return response.encrypted_data;
      },
      decrypt: async <T = unknown>(
        encryptedData: string,
        derivationPath?: string,
      ): Promise<T> => {
        const response = await decryptData(encryptedData, derivationPath);
        return JSON.parse(response, (_, value) => {
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
  }, [getPrivateKeyBytes, encryptData, decryptData]);
};
