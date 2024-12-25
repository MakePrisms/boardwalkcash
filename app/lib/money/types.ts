import type { Big } from 'big.js';

export type NumberInput = number | string | Big;

/** supported currencies */
export type Currency = 'USD' | 'BTC';

export type UsdUnit = 'usd' | 'cent';
export type BtcUnit = 'btc' | 'sat' | 'msat';

/** Unit to denominate the given currency */
export type CurrencyUnit<T extends Currency> = T extends 'USD'
  ? UsdUnit
  : T extends 'BTC'
    ? BtcUnit
    : never;

export type MoneyInput<T extends Currency = Currency> = {
  /**
   * Money amount
   */
  amount: NumberInput;
  /**
   * Currency for the provided amount of money
   */
  currency: T;
  /**
   * Unit of currency to use. For example for USD it can be 'usd' or 'cent', for BTC 'btc', 'sat' or 'msat', etc.
   * If not provided the default/base unit is used (bitcoin for BTC, dollar for USD, etc.)
   */
  unit?: CurrencyUnit<T>;
};

export type FormatOptions = {
  locale?: string;
  currency?: Currency;
};

export type UnitData<T extends Currency> = {
  name: CurrencyUnit<T>;
  decimals: number;
  symbol: string;
  factor: Big;
  format: (value: number, options?: FormatOptions) => string;
};

export type CurrencyData<T extends Currency> = {
  baseUnit: CurrencyUnit<T>;
  units: Array<UnitData<T>>;
};

export type BaseFormatOptions = FormatOptions & { decimals: number };

export type MoneyData<T extends Currency> = {
  /**
   * Currency of the money
   */
  currency: T;
  /**
   * Amount of the money stored in the `unit` format
   */
  amount: Big;
  /**
   * Unit in which the `amount` is stored. It is always the minimal supported unit for the `currency` (e.g. millisatoshi
   * for BTC)
   */
  amountUnit: UnitData<T>;
  /**
   * Unit of the initial amount that was provided when creating the money
   */
  initialUnit: UnitData<T>;
};

export type CurrencyDataMap = {
  [K in Currency]: CurrencyData<K>;
};
