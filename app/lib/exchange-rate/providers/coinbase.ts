import Big from 'big.js';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from './types';

export class Coinbase implements ExchangeRateProvider {
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

  async getRates({ signal, tickers }: GetRatesParams): Promise<Rates> {
    this.validateTickers(tickers);

    const response = await fetch(
      'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
      { signal },
    );

    const data = await response.json();
    const btcRates = data.data.rates;

    const rates: Rates = {
      timestamp: Date.now(),
    };

    for (const ticker of tickers) {
      if (ticker === 'USD-BTC') {
        rates[ticker] = new Big(1).div(btcRates.USD).toString();
      } else {
        const [, to] = ticker.split('-');
        rates[ticker] = btcRates[to];
      }
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
