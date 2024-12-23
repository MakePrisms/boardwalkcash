import Big from 'big.js';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from '~/lib/exchange-rate/providers/types';

export class Coingecko implements ExchangeRateProvider {
  supportedTickers: Ticker[] = [
    'BTC-USD',
    'BTC-EUR',
    'BTC-GBP',
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

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp,cad,chf,aud,jpy',
      {
        signal,
      },
    );

    const data = await response.json();

    const rates: Rates = {
      timestamp: Date.now(),
    };

    const bitcoinRates = data.bitcoin;

    for (const ticker of tickers) {
      const toCurrency = ticker.split('-')[1].toLowerCase();
      rates[ticker] = new Big(bitcoinRates[toCurrency]);
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
