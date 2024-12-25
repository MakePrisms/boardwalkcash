import { Big } from 'big.js';
import { Coinbase } from '~/lib/exchange-rate/providers/coinbase';
import { Coingecko } from '~/lib/exchange-rate/providers/coingecko';
import { MempoolSpace } from '~/lib/exchange-rate/providers/mempool-space';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from '~/lib/exchange-rate/providers/types';

class ExchangeRateService {
  // Keep order by priority
  private providers: ExchangeRateProvider[] = [
    new MempoolSpace(),
    new Coingecko(),
    new Coinbase(),
  ];

  async getRates({ tickers, signal }: GetRatesParams): Promise<Rates> {
    const providersForTickers = this.getProvidersForTickers(tickers);
    if (!providersForTickers.length) {
      throw new Error(
        `No provider that supports all the specified tickers: ${tickers}`,
      );
    }

    const errors: unknown[] = [];

    for (const provider of providersForTickers) {
      try {
        const rates = await provider.getRates({ tickers, signal });

        // Add inverse rates
        for (const ticker of tickers) {
          const [from, to] = ticker.split('-');
          const rate = rates[ticker];
          const inverseTicker = `${to}-${from}` as const;
          if (!(inverseTicker in rates)) {
            rates[inverseTicker] = new Big(1).div(rate).toString();
          }
        }

        return rates;
      } catch (e) {
        console.warn(`Error fetching rates from provider ${provider}`, e);
        errors.push(e);
      }
    }

    console.error('Failed to fetch rates', errors);
    throw new Error('Failed to fetch rates');
  }

  private getProvidersForTickers(tickers: Ticker[]): ExchangeRateProvider[] {
    const matchingProviders: ExchangeRateProvider[] = [];
    for (const provider of this.providers) {
      // check if provider.supportedTickers contains all tickers
      if (
        tickers.every((ticker) => provider.supportedTickers.includes(ticker))
      ) {
        matchingProviders.push(provider);
      }
    }
    return matchingProviders;
  }
}

export const exchangeRateService = new ExchangeRateService();
