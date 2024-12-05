import { describe, expect, test } from 'bun:test';
import { getCrossMintQuotes } from 'lib/cashu/quote';
import { initializeCashuWallet } from '../../../lib/cashu/util';

describe('getCrossMintQuotes', () => {
  test('should get cross mint quotes', async () => {
    const mintUrl1 = 'http://localhost:8081';
    const mintUrl2 = 'http://localhost:8082';
    const wallet1 = await initializeCashuWallet(mintUrl1, 'sat');
    const wallet2 = await initializeCashuWallet(mintUrl2, 'sat');

    const totalProofsAmount = 10;
    const maxAttempts = 5;

    const { mintQuote, meltQuote, amountToMint } = await getCrossMintQuotes(
      wallet1,
      wallet2,
      totalProofsAmount,
      maxAttempts,
    );

    expect(mintQuote).toBeDefined();
    expect(meltQuote).toBeDefined();
    expect(amountToMint).toBeDefined();
    expect(meltQuote.amount + meltQuote.fee_reserve).toBeLessThanOrEqual(
      totalProofsAmount,
    );
  });

  test('should not throw an error if units are different', async () => {
    const mintUrl1 = 'http://localhost:8081';
    const mintUrl2 = 'http://localhost:8082';
    const wallet1 = await initializeCashuWallet(mintUrl1, 'sat');
    const wallet2 = await initializeCashuWallet(mintUrl2, 'usd');

    const totalProofsAmount = 10;
    const maxAttempts = 5;

    expect(
      getCrossMintQuotes(wallet1, wallet2, totalProofsAmount, maxAttempts),
    ).resolves.not.toThrow();
  });
});
