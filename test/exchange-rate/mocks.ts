import { ExchangeRateProvider } from '../../app/lib/exchange-rate/providers/exchange-rate-provider';
import type {
  GetRatesParams,
  Rates,
} from '../../app/lib/exchange-rate/providers/types';

export class MockExchangeRateProvider extends ExchangeRateProvider {
  constructor(private shouldFail = false) {
    super();
    this.baseTickers = ['BTC-USD'];
  }

  protected async fetchRates(_params: GetRatesParams): Promise<Rates> {
    if (this.shouldFail) {
      throw new Error('Failed to fetch rates');
    }

    return {
      timestamp: Date.now(),
      'BTC-USD': '100000',
    };
  }
}

export class MockExchangeRateProviderEUR extends ExchangeRateProvider {
  constructor() {
    super();
    this.baseTickers = ['EUR-BTC'];
  }

  protected async fetchRates(_params: GetRatesParams): Promise<Rates> {
    return {
      timestamp: Date.now(),
      'EUR-BTC': '0.00002',
    };
  }
}

export class MockERProviderWithInverseTickers extends ExchangeRateProvider {
  constructor() {
    super();
    this.baseTickers = ['BTC-USD'];
  }

  protected async fetchRates(_params: GetRatesParams): Promise<Rates> {
    return {
      timestamp: Date.now(),
      'BTC-USD': '100000',
      'USD-BTC': '0.00005', // Purposely not the correct inverse
    };
  }
}
