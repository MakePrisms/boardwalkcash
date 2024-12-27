import { Coinbase } from '~/lib/exchange-rate/providers/coinbase';
import { Coingecko } from '~/lib/exchange-rate/providers/coingecko';
import { MempoolSpace } from '~/lib/exchange-rate/providers/mempool-space';
import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from '~/lib/exchange-rate/providers/types';

export class ExchangeRateService {
  private providers: ExchangeRateProvider[];

  constructor(providers?: ExchangeRateProvider[]) {
    // Keep order by priority
    this.providers = providers ?? [
      new MempoolSpace(),
      new Coingecko(),
      new Coinbase(),
    ];
  }

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
        return await provider.getRates({ tickers, signal });
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
