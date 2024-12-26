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
        const rates = await provider.getRates({
          tickers: tickers.filter((t) => t.split('-')[0] === 'BTC'),
          signal,
        });
        const result: Rates = {
          timestamp: rates.timestamp,
        };

        for (const ticker of tickers) {
          result[ticker] = this.getRateForTicker(ticker, rates);
        }

        return result;
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
      // check if provider.supportedTickers contains all tickers or their inverses
      if (
        tickers.every((ticker) => {
          const [from, to] = ticker.split('-');
          const inverseTicker: Ticker = `${to}-${from}`;
          return (
            provider.supportedTickers.includes(ticker) ||
            provider.supportedTickers.includes(inverseTicker)
          );
        })
      ) {
        matchingProviders.push(provider);
      }
    }
    return matchingProviders;
  }

  private getRateForTicker(ticker: Ticker, rates: Rates): string {
    if (rates[ticker]) {
      return rates[ticker];
    }

    const [from, to] = ticker.split('-');
    const inverseTicker = `${to}-${from}` as Ticker;

    if (rates[inverseTicker]) {
      return new Big(1).div(rates[inverseTicker]).toString();
    }

    throw new Error(`No rate found for ticker ${ticker}`);
  }
}

export const exchangeRateService = new ExchangeRateService();
