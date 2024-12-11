import { describe, expect, test } from 'bun:test';
import WalletManager from 'lib/cashu/WalletManager';
import { createMockStorage } from '../helpers';

describe('WalletManager', () => {
  test('should initialize wallets', async () => {
    const storage = createMockStorage();
    const walletManager = new WalletManager(storage);
    await walletManager.load();

    expect(walletManager.wallets.size).toBe(1);
    expect(walletManager.activeMintUrl).toBe('http://localhost:8081');
    expect(walletManager.activeUnit).toBe('sat');

    const wallets = walletManager.wallets.get('http://localhost:8081');
    expect(wallets?.size).toBe(1);

    const satWallet = wallets?.get('sat');
    expect(satWallet).toBeDefined();

    expect(satWallet?.mint.mintUrl).toBe('http://localhost:8081');
    expect(satWallet?.unit).toBe('sat');
    expect(satWallet?.keysetId).toBeDefined();
    expect(satWallet?.keys.size).toBeGreaterThanOrEqual(1);
    expect(satWallet?.mintInfo).toBeDefined();
    expect(satWallet?.keysets.length).toBeGreaterThanOrEqual(1);
    expect(satWallet?.mintInfo).toBeDefined();
  });
});
