import type { Rates } from '~/lib/exchange-rate';
import { type Currency, Money } from '~/lib/money';

function getConversionRate(from: Currency, to: Currency, rates: Rates) {
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

export function convert(
  money: Money,
  toCurrency: Currency,
  rates: Rates,
): Money {
  const fromCurrency = money.currency;
  const rate = getConversionRate(fromCurrency, toCurrency, rates);

  return Money.create({
    amount: rate,
    currency: toCurrency,
  }).multiply(money.amount);
}
