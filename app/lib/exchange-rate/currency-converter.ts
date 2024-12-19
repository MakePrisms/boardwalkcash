import type { Rates } from './providers/types';

type CurrencyCode = string;
type Rate = number;

type Currency = {
  code: string;
  base: number;
  exponent: number;
};

class CurrencyConverter {
  private currencies: Map<CurrencyCode, Currency> = new Map([
    ['USD', { code: 'USD', base: 10, exponent: 2 }],
    ['BTC', { code: 'BTC', base: 10, exponent: 8 }],
  ]);

  getCurrency(code: CurrencyCode): Currency | undefined {
    return this.currencies.get(code);
  }

  getConversionRate(from: CurrencyCode, to: CurrencyCode, rates: Rates): Rate {
    const key = `${from}-${to}`;
    const inverseKey = `${to}-${from}`;

    if (rates[key]) {
      return rates[key];
    }
    if (rates[inverseKey]) {
      return 1 / rates[inverseKey];
    }

    throw new Error(`No conversion rate found for ${from} to ${to}`);
  }

  // Convert between any two currencies
  convert(
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode,
    rates: Rates,
  ): number {
    const fromCurrency = this.getCurrency(from);
    const toCurrency = this.getCurrency(to);

    if (!fromCurrency || !toCurrency) {
      throw new Error('Currency not registered');
    }

    const rate = this.getConversionRate(from, to, rates);

    // Convert from smallest unit to base unit
    const baseAmount = amount / 10 ** fromCurrency.exponent;

    // Apply exchange rate
    const convertedBaseAmount = baseAmount * rate;

    // Convert to smallest unit of target currency
    const convertedAmount = convertedBaseAmount * 10 ** toCurrency.exponent;

    return convertedAmount;
  }
}

export const currencyConverter = new CurrencyConverter();
