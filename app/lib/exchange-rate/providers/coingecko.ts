import ky from 'ky';
import { ExchangeRateProvider } from './exchange-rate-provider';
import type { GetRatesParams, Rates, Ticker } from './types';

type CoingeckoRatesResponse = {
  bitcoin: Record<string, string>;
};

export class Coingecko extends ExchangeRateProvider {
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
    const response = await ky.get<CoingeckoRatesResponse>(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp,cad,chf,aud,jpy',
      {
        signal,
        timeout: 1_000,
      },
    );

    const data = await response.json();
    const bitcoinRates = data.bitcoin;

    const rates: Rates = {
      timestamp: Date.now(),
    };

    for (const ticker of this.baseTickers) {
      const [, to] = ticker.split('-');
      rates[ticker] = bitcoinRates[to.toLowerCase()].toString();
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
