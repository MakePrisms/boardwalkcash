import Big from 'big.js';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from '~/lib/exchange-rate/providers/types';

export class MempoolSpace implements ExchangeRateProvider {
  supportedTickers: Ticker[] = [
    'BTC-USD',
    'BTC-EUR',
    'BTC-GBP',
    'BTC-USD',
    'BTC-CAD',
    'BTC-CHF',
    'BTC-AUD',
    'BTC-JPY',
  ];

  async getRates({ tickers, signal }: GetRatesParams): Promise<Rates> {
    if (!tickers.length) {
      throw new Error('No tickers provided');
    }

    tickers.forEach((ticker) => {
      if (!this.supportedTickers.includes(ticker)) {
        throw new Error(`Unsupported ticker: ${ticker}`);
      }
    });

    const response = await fetch('https://mempool.space/api/v1/prices', {
      signal,
    });

    const data = await response.json();

    const rates: Rates = {
      timestamp: data.time * 1000,
    };

    for (const ticker of tickers) {
      const toCurrency = ticker.split('-')[1];
      rates[ticker] = new Big(data[toCurrency]).toString();
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
