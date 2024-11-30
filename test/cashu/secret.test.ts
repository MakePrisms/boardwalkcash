import { describe, expect, test } from 'bun:test';
import { parseSecret } from '../../lib/cashu';

describe('parseSecret', () => {
  test('should return a secret as described in NUT00', () => {
    const s = parseSecret(
      '859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f',
    );
    expect(s).toBe(
      '859d4935c4907062a6297cf4e663e2835d90d97ecdd510745d32f6816323a41f',
    );
  });

  test('should throw if secret is not in WELL_KNOWN_SECRET_KINDS', () => {
    expect(() =>
      parseSecret('["HTLC",{"nonce":"0","data":"0","tags":[]}]'),
    ).toThrow();
  });
});
