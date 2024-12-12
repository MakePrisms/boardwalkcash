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
