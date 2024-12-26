import { describe, expect, test } from 'bun:test';
import {
  MockERProviderWithInverseTickers,
  MockExchangeRateProvider,
} from './mocks';

describe('ExchangeRateProvider', () => {
  const createAbortController = () => new AbortController();

  test('supports both direct and inverse tickers', () => {
    const provider = new MockExchangeRateProvider();
    expect(provider.supportedTickers).toContain('USD-BTC');
    expect(provider.supportedTickers).toContain('BTC-USD');
  });

  test('fetches USD-BTC rate directly by calculating inverse of BTC-USD', async () => {
    const provider = new MockExchangeRateProvider();
    const rates = await provider.getRates({
      tickers: ['USD-BTC'],
      signal: createAbortController().signal,
    });

    expect(rates['USD-BTC']).toBe('0.00001');
  });

  test('can fetch both USD-BTC and BTC-USD rates simultaneously', async () => {
    const provider = new MockExchangeRateProvider();
    const rates = await provider.getRates({
      tickers: ['USD-BTC', 'BTC-USD'],
      signal: createAbortController().signal,
    });

    expect(rates['USD-BTC']).toBe('0.00001');
    expect(rates['BTC-USD']).toBe('100000');
  });

  test('throws error for unsupported tickers', () => {
    const provider = new MockExchangeRateProvider();
    expect(
      provider.getRates({
        tickers: ['EUR-BTC'],
        signal: createAbortController().signal,
      }),
    ).rejects.toThrow('Unsupported ticker: EUR-BTC');
  });

  test('uses provided inverse rate instead of calculating it', async () => {
    const provider = new MockERProviderWithInverseTickers();
    const rates = await provider.getRates({
      tickers: ['USD-BTC', 'BTC-USD'],
      signal: createAbortController().signal,
    });

    expect(rates['USD-BTC']).toBe('0.00005');
    expect(rates['BTC-USD']).toBe('100000');
  });
});
