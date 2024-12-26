import { ExchangeRateProvider } from './exchange-rate-provider';
import type { GetRatesParams, Rates, Ticker } from './types';

export class MempoolSpace extends ExchangeRateProvider {
  protected baseTickers: Ticker[] = [
    'BTC-USD',
    'BTC-EUR',
    'BTC-GBP',
    'BTC-CAD',
    'BTC-CHF',
    'BTC-AUD',
    'BTC-JPY',
  ];

  protected async fetchRates({ signal }: GetRatesParams): Promise<Rates> {
    const response = await fetch('https://mempool.space/api/v1/prices', {
      signal,
    });

    const data = await response.json();

    const rates: Rates = {
      timestamp: data.time * 1000,
    };

    for (const ticker of this.baseTickers) {
      const [, to] = ticker.split('-');
      rates[ticker] = data[to].toString();
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
