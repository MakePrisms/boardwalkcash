import { ExchangeRateProvider } from './exchange-rate-provider';
import type { GetRatesParams, Rates, Ticker } from './types';

export class Coinbase extends ExchangeRateProvider {
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
    const response = await fetch(
      'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
      { signal },
    );

    const data = await response.json();
    const btcRates = data.data.rates;

    const rates: Rates = {
      timestamp: Date.now(),
    };

    for (const ticker of this.baseTickers) {
      const [, to] = ticker.split('-');
      rates[ticker] = btcRates[to];
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
