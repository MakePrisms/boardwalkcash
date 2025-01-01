import { describe, expect, test } from 'bun:test';
import { getP2PKPubkeyFromSecret, parseSecret } from './secret';

describe('parseSecret', () => {
  test('should return the input value if input value is NUT00 plain secret', () => {
    const s = parseSecret(
      '859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f',
    );
    expect(s).toBe(
      '859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f',
    );
  });

  test('should successfully parse a valid NUT10 secret', () => {
    const s = parseSecret(
      '["P2PK",{"nonce":"abc123","data":"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7","tags":[["sigflag","SIG_INPUTS"]]}]',
    );
    expect(s).toEqual({
      kind: 'P2PK',
      nonce: 'abc123',
      data: '0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7',
      tags: [['sigflag', 'SIG_INPUTS']],
    });
  });

  describe('should not throw if', () => {
    test('tags are not provided', () => {
      const s = parseSecret(
        '["P2PK",{"nonce":"abc123","data":"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7"}]',
      );
      expect(s).toEqual({
        kind: 'P2PK',
        nonce: 'abc123',
        data: '0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7',
      });
    });

    test('a tag has multiple values', () => {
      const s = parseSecret(
        '["P2PK",{"nonce":"abc123","data":"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7","tags":[["sigflag","a","b"]]}]',
      );
      expect(s).toEqual({
        kind: 'P2PK',
        nonce: 'abc123',
        data: '0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7',
        tags: [['sigflag', 'a', 'b']],
      });
    });
  });
  describe('should throw for invalid NUT10 secret if', () => {
    test('secret is not in WELL_KNOWN_SECRET_KINDS', () => {
      expect(() =>
        parseSecret('["HTLC",{"nonce":"0","data":"0","tags":[]}]'),
      ).toThrow();
    });

    test('nonce is not a string', () => {
      expect(() => parseSecret('["P2PK",{"nonce":123,"data":"test"}]')).toThrow(
        'Invalid secret format',
      );
    });

    test('data is not a string', () => {
      expect(() =>
        parseSecret('["P2PK",{"nonce":"test","data":false}]'),
      ).toThrow('Invalid secret format');
    });

    test('tags is not an array of string arrays', () => {
      expect(() =>
        parseSecret(
          '["P2PK",{"nonce":"test","data":"test","tags":["invalid"]}]',
        ),
      ).toThrow('Invalid secret format');
    });
  });
});

describe('getP2PKPubkeyFromSecret', () => {
  test('should return the public key from a P2PK secret', () => {
    const pubkey = getP2PKPubkeyFromSecret(
      '["P2PK",{"nonce":"abc123","data":"0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7"}]',
    );
    expect(pubkey).toBe(
      '0249098aa8b9d2fbec49ff8598feb17b592b986e62319a4fa488a3dc36387157a7',
    );
  });

  describe('should throw if', () => {
    test('secret is not a P2PK secret', () => {
      expect(() => getP2PKPubkeyFromSecret('not-a-p2pk-secret')).toThrow(
        'Secret is not a P2PK secret',
      );
    });

    test('secret is an invalid NUT10 secret', () => {
      expect(() =>
        getP2PKPubkeyFromSecret('["P2PK",{"nonce":123,"data":"test"}]'),
      ).toThrow('Invalid secret format');
    });
  });
});
