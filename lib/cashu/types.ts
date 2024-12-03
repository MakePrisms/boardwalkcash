import type { OutputAmounts, Proof } from '@cashu/cashu-ts';

// [ "key", "value1", "value2", ...]
export type NUT10SecretTag = [string, ...string[]];

export const WELL_KNOWN_SECRET_KINDS = ['P2PK'] as const;
export type WellKnownSecretKind = (typeof WELL_KNOWN_SECRET_KINDS)[number];

export type NUT10SecretData = {
  nonce: string;
  data: string;
  tags?: NUT10SecretTag[];
};

export type ParsedNUT10Secret = [WellKnownSecretKind, NUT10SecretData];

export type NUT10Secret = {
  kind: WellKnownSecretKind;
  data: string;
  nonce: string;
  tags?: NUT10SecretTag[];
};

export type ProofSecret = NUT10Secret | string;

/**
 * Result of swapping proofs between two different mints
 */
export type CrossMintSwapResult = {
  /** Proofs that were minted */
  proofs: Proof[];
  /** Change proofs from the mint that was swapped from */
  change: Proof[];
};

export type LockOperationOptions = {
  pubkey: string;
};

export type UnlockOperationOptions = {
  privkey?: string;
};

export type SendOptions = {
  outputAmounts?: OutputAmounts;
  proofsWeHave?: Array<Proof>;
  counter?: number;
  pubkey?: string;
  privkey?: string;
  keysetId?: string;
  offline?: boolean;
  includeFees?: boolean;
  includeDleq?: boolean;
};

export type SwapOptions = {
  outputAmounts?: OutputAmounts;
  proofsWeHave?: Array<Proof>;
  counter?: number;
  pubkey?: string;
  privkey?: string;
  keysetId?: string;
  includeFees?: boolean;
};

export type MeltProofOptions = {
  keysetId?: string;
  counter?: number;
  privkey?: string;
};

export type MintProofOptions = {
  keysetId?: string;
  outputAmounts?: OutputAmounts;
  proofsWeHave?: Array<Proof>;
  counter?: number;
  pubkey?: string;
};
