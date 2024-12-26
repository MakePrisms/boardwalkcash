import Big from 'big.js';
import type {
  GetRatesParams,
  ExchangeRateProvider as IExchangeRateProvider,
  Rates,
  Ticker,
} from './types';

export abstract class ExchangeRateProvider implements IExchangeRateProvider {
  protected baseTickers: Ticker[] = [];
  private _inverseTickers: Set<Ticker> | null = null;
  private _supportedTickers: Ticker[] | null = null;

  get supportedTickers(): Ticker[] {
    if (!this._supportedTickers) {
      const inverseTickers = this.baseTickers
        // Only calculate inverse tickers for BTC rates
        .filter((ticker) => ticker.split('-')[0] === 'BTC')
        .map((ticker) => {
          const [from, to] = ticker.split('-');
          const inverse = `${to}-${from}` as Ticker;
          // Only include inverse tickers that are not already in the baseTickers
          return !this.baseTickers.includes(inverse) ? inverse : null;
        })
        .filter((ticker): ticker is Ticker => ticker !== null);

      this._inverseTickers = new Set(inverseTickers);
      this._supportedTickers = [...this.baseTickers, ...inverseTickers];
    }
    return this._supportedTickers;
  }

  protected validateTickers(tickers: Ticker[]): void {
    if (!tickers.length) {
      throw new Error('No tickers provided');
    }

    tickers.forEach((ticker) => {
      if (!this.supportedTickers.includes(ticker)) {
        throw new Error(`Unsupported ticker: ${ticker}`);
      }
    });
  }

  protected isInverseTicker(ticker: Ticker): boolean {
    // Ensure supportedTickers has been initialized to populate _inverseTickers
    this.supportedTickers;
    return this._inverseTickers?.has(ticker) ?? false;
  }

  protected abstract fetchRates(params: GetRatesParams): Promise<Rates>;

  async getRates(params: GetRatesParams): Promise<Rates> {
    this.validateTickers(params.tickers);
    const allRates = await this.fetchRates(params);

    const rates: Rates = {
      timestamp: allRates.timestamp,
    };

    for (const ticker of params.tickers) {
      if (this.isInverseTicker(ticker) && !allRates[ticker]) {
        const [from, to] = ticker.split('-');
        const baseRate = allRates[`${to}-${from}`];
        rates[ticker] = new Big(1).div(baseRate).toString();
      } else {
        // not looking for inverse, or fetchRates returned the inverse rate
        rates[ticker] = allRates[ticker];
      }
    }

    return rates;
  }

  toString(): string {
    return this.constructor.name;
  }
}
