import {
  type NUT10SecretData,
  type ParsedNUT10Secret,
  type ProofSecret,
  WELL_KNOWN_SECRET_KINDS,
} from './types';

/**
 * Parse secret string from Proof.secret into a well-known secret [NUT-10](https://github.com/cashubtc/nuts/blob/main/10.md)
 * or a string [NUT-00](https://github.com/cashubtc/nuts/blob/main/00.md)
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

  //  Check if parsed value matches well-known secret format:
  //      ["P2PK", {
  //        nonce: string,
  //        data: string,
  //        tags?: string[]
  //      }]
  const isValidSecret = (value: unknown): value is ParsedNUT10Secret =>
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'object' &&
    value[1] !== null &&
    typeof (value[1] as NUT10SecretData).nonce === 'string' &&
    typeof (value[1] as NUT10SecretData).data === 'string' &&
    (!(value[1] as NUT10SecretData).tags ||
      Array.isArray((value[1] as NUT10SecretData).tags));

  if (!isValidSecret(parsed)) {
    throw new Error('Invalid secret format');
  }
  const [kind, data] = parsed;
  if (!WELL_KNOWN_SECRET_KINDS.includes(kind)) {
    throw new Error(`Unknown secret kind: ${kind}`);
  }

  return {
    kind,
    ...data,
  };
};

export const getP2PKPubkeyFromSecret = (secret: string) => {
  const parsedSecret = parseSecret(secret);
  if (typeof parsedSecret === 'string' || parsedSecret?.kind !== 'P2PK') {
    throw new Error('Secret is not a P2PK secret');
  }
  return parsedSecret.data;
};
