import type { Proof } from '@cashu/cashu-ts';
import { getP2PKPubkeyFromSecret } from './secret';

/**
 * Get the pubkey that a list of proofs are locked to.
 * @param proofs - The list of proofs to get the pubkey from.
 * @returns The pubkey in the P2PK secrets
 * @throws Error if there are multiple pubkeys in the list or if the secret is not a P2PK secret.
 */
export const getP2PKPubkeyFromProofs = (proofs: Proof[]) => {
  const pubkeys = [
    ...new Set(
      proofs.map((p) => getP2PKPubkeyFromSecret(p.secret)).filter(Boolean),
    ),
  ];
  if (pubkeys.length > 1) {
    throw new Error('Received a token with multiple pubkeys');
  }
  return pubkeys[0] || null;
};
