import Big from 'big.js';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from './types';

export class Coingecko implements ExchangeRateProvider {
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

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp,cad,chf,aud,jpy',
      { signal },
    );

    const data = await response.json();
    const bitcoinRates = data.bitcoin;

    const rates: Rates = {
      timestamp: Date.now(),
    };

    for (const ticker of tickers) {
      if (ticker === 'USD-BTC') {
        rates[ticker] = new Big(1).div(bitcoinRates.usd).toString();
      } else {
        const [, to] = ticker.split('-');
        rates[ticker] = bitcoinRates[to.toLowerCase()].toString();
      }
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
