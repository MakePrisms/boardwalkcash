import type {
  ExchangeRateProvider,
  GetRatesParams,
  Rates,
  Ticker,
} from '../../app/lib/exchange-rate/providers/types';

export class MockExchangeRateProvider implements ExchangeRateProvider {
  readonly supportedTickers: Ticker[] = ['BTC-USD', 'USD-BTC'];
  private shouldFail = false;

  constructor(shouldFail = false) {
    this.shouldFail = shouldFail;
  }

  async getRates(_params: GetRatesParams): Promise<Rates> {
    if (this.shouldFail) {
      throw new Error('Failed to fetch rates');
    }

    return {
      timestamp: Date.now(),
      'BTC-USD': '100000',
      'USD-BTC': '0.00001',
    };
  }
}

export class MockExchangeRateProviderEUR implements ExchangeRateProvider {
  readonly supportedTickers: Ticker[] = ['EUR-BTC'];

  async getRates(params: GetRatesParams): Promise<Rates> {
    return this.fetchRates(params);
  }

  protected async fetchRates(_params: GetRatesParams): Promise<Rates> {
    return {
      timestamp: Date.now(),
      'EUR-BTC': '0.00002',
    };
  }
}
