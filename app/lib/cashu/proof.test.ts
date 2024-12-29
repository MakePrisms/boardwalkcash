import { describe, expect, test } from 'bun:test';
import type { Proof } from '@cashu/cashu-ts';
import { getP2PKPubkeyFromProofs } from './proof';

const proofWithP2PKSecret: Proof = {
  amount: 1,
  secret:
    '["P2PK",{"nonce":"0","data":"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7","tags":[["sigflag","SIG_INPUTS"]]}]',
  C: '02698c4e2b5f9534cd0687d87513c759790cf829aa5739184a3e3735471fbda904',
  id: '009a1f293253e41e',
};

const proof2WithDifferentPubkey: Proof = {
  amount: 1,
  secret:
    '["P2PK",{"nonce":"0","data":"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a8","tags":[["sigflag","SIG_INPUTS"]]}]',
  C: '02698c4e2b5f9534cd0687d87513c759790cf829aa5739184a3e3735471fbda904',
  id: '009a1f293253e41e',
};

const proofWithPlainSecret: Proof = {
  amount: 1,
  secret: '0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7',
  C: '02698c4e2b5f9534cd0687d87513c759790cf829aa5739184a3e3735471fbda904',
  id: '009a1f293253e41e',
};

describe('getP2PKPubkeyFromProofs', () => {
  test('proof with P2PK secret should return the pubkey', () => {
    expect(getP2PKPubkeyFromProofs([proofWithP2PKSecret])).toBe(
      '0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a6',
    );
  });

  test('proofs with multiple pubkeys should throw', () => {
    expect(() =>
      getP2PKPubkeyFromProofs([proofWithP2PKSecret, proof2WithDifferentPubkey]),
    ).toThrow();
  });

  test('an empty array should return null', () => {
    expect(getP2PKPubkeyFromProofs([])).toBeNull();
  });

  test('should throw if any proofs have a plain secret', () => {
    expect(() =>
      getP2PKPubkeyFromProofs([proofWithP2PKSecret, proofWithPlainSecret]),
    ).toThrow('Secret is not a P2PK secret');
  });
});
