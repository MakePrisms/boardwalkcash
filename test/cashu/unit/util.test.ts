import { describe, expect, test } from 'bun:test';
import { initializeCashuWallet } from 'lib/cashu/util';

describe('initializeCashuWallet', () => {
  test('should initialize a wallet', async () => {
    const mintUrl = 'http://localhost:8081';
    const wallet = await initializeCashuWallet(mintUrl, 'sat');
    expect(wallet).toBeTruthy();
    expect(wallet.unit).toBe('sat');
    expect(wallet.mint.mintUrl).toBe(mintUrl);
    expect(wallet.keysetId).toBeDefined();
    expect(wallet.keys.size).toBeGreaterThanOrEqual(1);
    expect(wallet.mintInfo).toBeDefined();
    expect(wallet.keysets.length).toBeGreaterThanOrEqual(1);
  });
});
