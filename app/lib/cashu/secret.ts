import { z } from 'zod';
import { RawNUT10SecretSchema } from './schemas';
import {
  type NUT10Secret,
  type P2PKSecret,
  type PlainSecret,
  type ProofSecret,
  WELL_KNOWN_SECRET_KINDS,
} from './types';

/**
 * Type guard to check if asecret is a NUT-10 secret
 */
export const isNUT10Secret = (secret: ProofSecret): secret is NUT10Secret => {
  return typeof secret !== 'string';
};

/**
 * Type guard to check if a secret is a P2PK secret
 */
export const isP2PKSecret = (secret: ProofSecret): secret is P2PKSecret => {
  return (
    isNUT10Secret(secret) &&
    secret.kind === WELL_KNOWN_SECRET_KINDS.find((kind) => kind === 'P2PK')
  );
};

/**
 * Type guard to check if a secret is a plain string secret
 */
export const isPlainSecret = (secret: ProofSecret): secret is PlainSecret => {
  return typeof secret === 'string';
};

/**
 * Parse secret string from Proof.secret into a well-known secret [NUT-10](https://github.com/cashubtc/nuts/blob/main/10.md)
 * or a string [NUT-00](https://github.com/cashubtc/nuts/blob/main/00.md)
 * @param secret - The stringified secret to parse
 * @returns The parsed secret as a NUT-10 secret or a string
 * @throws Error if the secret is a NUT-10 secret with an invalid format
 */
export const parseSecret = (secret: string): ProofSecret => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(secret);
  } catch {
    // If JSON parsing fails, assume it's a plain string secret
    // as defined in NUT-00
    return secret;
  }

  try {
    const validatedSecret = RawNUT10SecretSchema.parse(parsed);
    const [kind, data] = validatedSecret;

    return {
      kind,
      ...data,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error('Invalid secret format');
    }
    throw error;
  }
};

/**
 * Extract the public key from a P2PK secret
 * @param secret - The stringified secret to parse
 * @returns The public key stored in the secret's data field
 * @throws Error if the secret is not a valid P2PK secret
 */
export const getP2PKPubkeyFromSecret = (secret: string): string => {
  const parsedSecret = parseSecret(secret);
  if (!isP2PKSecret(parsedSecret)) {
    throw new Error('Secret is not a P2PK secret');
  }
  return parsedSecret.data;
};
