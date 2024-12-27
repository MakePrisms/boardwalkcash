import Big from 'big.js';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from './types';

export class MempoolSpace implements ExchangeRateProvider {
  readonly supportedTickers: Ticker[] = [
    'BTC-USD',
    'BTC-EUR',
    'BTC-GBP',
    'BTC-CAD',
    'BTC-CHF',
    'BTC-AUD',
    'BTC-JPY',
    'USD-BTC',
  ];

  private validateTickers(tickers: Ticker[]): void {
    if (!tickers.length) {
      throw new Error('No tickers provided');
    }

    tickers.forEach((ticker) => {
      if (!this.supportedTickers.includes(ticker)) {
        throw new Error(`Unsupported ticker: ${ticker}`);
      }
    });
  }

  async getRates({ tickers, signal }: GetRatesParams): Promise<Rates> {
    this.validateTickers(tickers);

    const response = await fetch('https://mempool.space/api/v1/prices', {
      signal,
    });

    const data = await response.json();

    const rates: Rates = {
      timestamp: data.time * 1000,
    };

    for (const ticker of tickers) {
      if (ticker === 'USD-BTC') {
        rates[ticker] = new Big(1).div(data.USD).toString();
      } else {
        const [, to] = ticker.split('-');
        rates[ticker] = data[to].toString();
      }
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
