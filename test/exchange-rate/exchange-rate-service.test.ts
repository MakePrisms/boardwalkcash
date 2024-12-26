import { describe, expect, test } from 'bun:test';
import { ExchangeRateService } from '../../app/lib/exchange-rate/exchange-rate-service';
import { MockExchangeRateProvider, MockExchangeRateProviderEUR } from './mocks';

describe('ExchangeRateService', () => {
  const createAbortController = () => new AbortController();

  test('uses provided exchange rate providers', async () => {
    const mockProvider = new MockExchangeRateProvider();
    const service = new ExchangeRateService([mockProvider]);

    const rates = await service.getRates({
      tickers: ['BTC-USD', 'USD-BTC'],
      signal: createAbortController().signal,
    });

    expect(rates['BTC-USD']).toBe('100000');
    expect(rates['USD-BTC']).toBe('0.00001');
  });

  test('falls back to next provider on failure', async () => {
    const failingProvider = new MockExchangeRateProvider(true);
    const workingProvider = new MockExchangeRateProvider();
    const service = new ExchangeRateService([failingProvider, workingProvider]);

    const rates = await service.getRates({
      tickers: ['BTC-USD'],
      signal: createAbortController().signal,
    });

    expect(rates['BTC-USD']).toBe('100000');
  });

  test('throws error when no provider supports requested tickers', async () => {
    const mockProvider = new MockExchangeRateProvider();
    const service = new ExchangeRateService([mockProvider]);

    await expect(
      service.getRates({
        tickers: ['JPY-BTC'],
        signal: createAbortController().signal,
      }),
    ).rejects.toThrow('No provider that supports all the specified tickers');
  });

  test('finds provider that supports requested tickers', async () => {
    const btcProvider = new MockExchangeRateProvider();
    const eurProvider = new MockExchangeRateProviderEUR();
    const service = new ExchangeRateService([btcProvider, eurProvider]);

    const rates = await service.getRates({
      tickers: ['EUR-BTC'],
      signal: createAbortController().signal,
    });

    expect(rates['EUR-BTC']).toBe('0.00002');
  });

  test('throws error when all providers fail', async () => {
    const failingProvider1 = new MockExchangeRateProvider(true);
    const failingProvider2 = new MockExchangeRateProvider(true);
    const service = new ExchangeRateService([
      failingProvider1,
      failingProvider2,
    ]);

    expect(
      service.getRates({
        tickers: ['BTC-USD'],
        signal: createAbortController().signal,
      }),
    ).rejects.toThrow('Failed to fetch rates');
  });
});
