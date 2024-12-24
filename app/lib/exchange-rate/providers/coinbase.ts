import { Big } from 'big.js';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from '~/lib/exchange-rate/providers/types';

export class Coinbase implements ExchangeRateProvider {
  supportedTickers: Ticker[] = ['BTC-USD'];

  async getRates({ tickers, signal }: GetRatesParams): Promise<Rates> {
    if (!tickers.length) {
      throw new Error('No tickers provided');
    }

    tickers.forEach((ticker) => {
      if (!this.supportedTickers.includes(ticker)) {
        throw new Error(`Unsupported ticker: ${ticker}`);
      }
    });

    const response = await fetch(
      'https://api.coinbase.com/v2/prices/BTC-USD/spot',
      { signal },
    );

    const data = await response.json();
    return {
      'BTC-USD': new Big(data.data.amount).toString(),
      timestamp: Date.now(),
    };
  }

  toString(): string {
    return this.constructor.name;
  }
}
