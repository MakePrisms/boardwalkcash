import type { Big } from 'big.js';

export type NumberInput = number | string | Big;

export type MoneyInput = {
  /**
   * Money amount
   */
  amount: NumberInput;
  /**
   * Currency for the provided amount of money
   */
  currency: string;
  /**
   * Unit of currency to use. For example for USD it can be 'usd' or 'cent', for BTC 'btc', 'sat' or 'sat', etc.
   * If not provided the default/base unit is used (bitcoin for BTC, dollar for USD, etc.)
   */
  unit?: string;
};

export type FormatOptions = {
  locale?: string;
  currency?: string;
};

export type CurrencyUnit = {
  name: string;
  decimals: number;
  symbol: string;
  factor: Big;
  format: (value: number, options?: FormatOptions) => string;
};

export type CurrencyData = {
  baseUnit: string;
  units: CurrencyUnit[];
};

export type BaseFormatOptions = FormatOptions & { decimals: number };

export type MoneyData = {
  /**
   * Currency of the money
   */
  currency: string;
  /**
   * Amount of the money stored in the `unit` format
   */
  amount: Big;
  /**
   * Unit in which the `amount` is stored. It is always the minimal supported unit for the `currency` (e.g. millisatoshi
   * for BTC)
   */
  amountUnit: CurrencyUnit;
  /**
   * Unit of the initial amount that was provided when creating the money
   */
  initialUnit: CurrencyUnit;
};
