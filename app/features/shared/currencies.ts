import type { Currency, CurrencyUnit } from '~/lib/money';

const currencyToDefaultUnit: {
  [K in Currency]: CurrencyUnit<K>;
} = {
  BTC: 'sat',
  USD: 'usd',
};

export const getDefaultUnit = <C extends Currency>(currency: C) => {
  return currencyToDefaultUnit[currency];
};
