import type { Proof } from '@cashu/cashu-ts';
import { hashToCurve } from '@cashu/crypto/modules/common';
import { getP2PKPubkeyFromSecret } from './secret';

/**
 * Get the pubkey that a list of proofs are locked to.
 * @param proofs - The list of proofs to get the pubkey from.
 * @returns The pubkey in the P2PK secrets
 * @throws Error if there are multiple pubkeys in the list or if the secret is not a P2PK secret.
 */
export const getP2PKPubkeyFromProofs = (proofs: Proof[]): string | null => {
  const pubkeys = [
    ...new Set(
      proofs.map((p) => getP2PKPubkeyFromSecret(p.secret)).filter(Boolean),
    ),
  ];
  if (pubkeys.length > 1) {
    throw new Error('Received a set of proofs with multiple pubkeys');
  }
  return pubkeys[0] || null;
};

/** Sum the amounts from a list of proofs. */
export const sumProofsToAmount = (proofs: Proof[]): number => {
  return proofs.reduce((acc, proof) => {
    return acc + proof.amount;
  }, 0);
};

/**
 * Determinsitcally maps the proof's secret to point on the curve.
 *
 * @see https://github.com/cashubtc/nuts/blob/main/00.md#hash_to_curvex-bytes---curve-point-y
 */
export const proofToY = (proof: Proof): string => {
  const encoder = new TextEncoder();
  return hashToCurve(encoder.encode(proof.secret)).toHex(true);
};
