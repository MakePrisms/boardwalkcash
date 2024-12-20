import { Big, type RoundingMode } from 'big.js';

const currencies = ['USD', 'BTC'] as const;
export type Currency = (typeof currencies)[number];

type NumberInput = number | string | Big;

type IntlOptions = Parameters<typeof Intl.NumberFormat>[1] & {
  currency?: Currency;
};

type MoneyInput = {
  amount: NumberInput;
  currency: Currency;
  subunit?: string;
  roundingMode?: RoundingMode;
};

type CurrencyDefinition = {
  symbol: string;
  decimals: number;
  subunit: string;
  subunitSymbol: string;
};

const currencyData: Record<Currency, CurrencyDefinition> = {
  USD: {
    symbol: '$',
    decimals: 2,
    subunit: 'cent',
    subunitSymbol: '¢',
  },
  BTC: {
    symbol: '₿',
    decimals: 8,
    subunit: 'satoshi',
    subunitSymbol: '₿',
  },
};

type MoneyData = {
  amount: Big;
  currency: Currency;
  decimals: number;
  roundingMode?: RoundingMode;
};

export class Money {
  private readonly _data: MoneyData;

  constructor(data: MoneyInput) {
    const currencyDefinition = currencyData[data.currency];
    if (!currencyDefinition) {
      throw new Error(`Unsupported currency: ${data.currency}`);
    }
    const decimals = currencyDefinition.decimals;

    let amount = new Big(data.amount);
    if (data.subunit) {
      if (data.subunit !== currencyDefinition.subunit) {
        throw new Error(`Unsupported subunit: ${data.subunit}`);
      }
      amount = amount.div(10 ** currencyDefinition.decimals);
    }

    this._data = {
      amount: amount.round(decimals),
      currency: data.currency,
      decimals: decimals,
    };

    Object.freeze(this);
    Object.freeze(this._data);
  }

  static create(props: MoneyInput): Money {
    return new Money(props);
  }

  /**
   * Sum an array of moneys.
   *
   * If the array is empty, a currency must be specified so that 0 can be returned in that currency.
   *
   * The precision, rounding mode, etc, is based on the first item in the array.
   * If the array is empty, the options object will be used instead.
   */
  static sum(moneys: Money[], currency?: Currency): Money {
    if (moneys.length === 0 && currency === undefined) {
      throw new Error(
        "Currency must be set when summing an empty list of money's",
      );
    }

    if (moneys.length === 0 && currency !== undefined) {
      return new Money({ amount: 0, currency });
    }

    return moneys.slice(1).reduce((sum, money) => sum.add(money), moneys[0]);
  }

  static max(moneys: Money[]): Money {
    if (moneys.length === 0) {
      throw new Error('Need at least one money for comparison');
    }
    return moneys.reduce(
      (max, money) => (money.greaterThan(max) ? money : max),
      moneys[0],
    );
  }

  static min(moneys: Money[]): Money {
    if (moneys.length === 0) {
      throw new Error('Need at least one money for comparison');
    }
    return moneys.reduce(
      (min, money) => (money.lessThan(min) ? money : min),
      moneys[0],
    );
  }

  /**
   * Compare two money objects.
   *
   * 1 if money1 is greater than money2
   * 0 if equal
   * -1 if money1 is less than money2
   *
   * This can be plugged directly into array.sort(),
   * and it will cause the array to be sorted in ascending order.
   */
  static compare(money1: Money, money2: Money): number {
    money1.assertSameCurrency(money2);
    return money1.amount.cmp(money2.amount);
  }

  get currency(): Currency {
    return this._data.currency;
  }

  get amount(): Big {
    return this._data.amount;
  }

  get subunitAmount(): Big {
    return this._data.amount.mul(10 ** this._data.decimals);
  }

  multiply = (factor: NumberInput): Money => {
    const amount = this.amount.mul(factor);
    return this.merge({ amount });
  };

  /**
   * Note that dividing a monetary amount cannot be exact in all cases.
   * E.g. 10 NOK / 3 = 3.33 NOK
   * Use `distribute` or `distributeBy` if you need an exact distribution.
   *
   * The division is performed with a precision of 20 decimals before
   * rounding back to the monetary amount. (See https://mikemcl.github.io/big.js/#dp)
   */
  divide = (divisor: NumberInput): Money => {
    const amount = this.amount.div(divisor);
    return this.merge({ amount });
  };

  add = (money: Money): Money => {
    this.assertSameCurrency(money);
    return this.merge({ amount: this.amount.plus(money.amount) });
  };

  subtract = (money: Money): Money => {
    this.assertSameCurrency(money);
    return this.merge({ amount: this.amount.minus(money.amount) });
  };

  abs = (): Money => {
    return this.merge({ amount: this.amount.abs() });
  };

  equals = (money: Money): boolean => {
    return this.currency === money.currency && this.amount.eq(money.amount);
  };

  greaterThan = (money: Money): boolean => {
    this.assertSameCurrency(money);
    return this.amount.gt(money.amount);
  };

  greaterThanOrEqual = (money: Money): boolean => {
    this.assertSameCurrency(money);
    return this.amount.gte(money.amount);
  };

  lessThan = (money: Money): boolean => {
    this.assertSameCurrency(money);
    return this.amount.lt(money.amount);
  };

  lessThanOrEqual = (money: Money): boolean => {
    this.assertSameCurrency(money);
    return this.amount.lte(money.amount);
  };

  isZero = (): boolean => {
    return this.amount.eq(0);
  };

  /**
   * Is greater than 0
   */
  isPositive = (): boolean => {
    return this.amount.gt(0);
  };

  /**
   * Is lower than 0
   */
  isNegative = (): boolean => {
    return this.amount.lt(0);
  };

  /**
   * Converts to a regular javascript number.
   * Throws an error if it's not possible to keep full precision.
   */
  toNumber = (subunit = false): number => {
    // Don't use big.js toNumber because it sometimes returns -0.
    const str = this.toString(subunit);
    const num = Number(str);

    if (
      str !==
      this.merge({
        amount: num,
        subunit: subunit ? currencyData[this.currency].subunit : undefined,
      }).toString(subunit)
    ) {
      throw new Error('Converting to number was imprecise');
    }

    return num;
  };

  toString = (subunit = false): string => {
    if (subunit) {
      return this.subunitAmount.toFixed(0);
    }
    return this.amount.toFixed(this._data.decimals);
  };

  toLocaleString = ({
    locale,
    currency = true,
    subunit = false,
  }: {
    locale?: string;
    currency?: boolean;
    subunit?: boolean;
  } = {}): string => {
    const decimals = subunit ? 0 : this._data.decimals;

    const options: IntlOptions = {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    };
    if (currency) {
      options.style = 'currency';
      options.currency = this.currency;
    }
    return Money.formatNumber(this.toNumber(subunit), subunit, locale, options);
  };

  private assertSameCurrency = (money: Money): Money => {
    if (money.currency !== this.currency) {
      throw new Error('Currencies must be the same');
    }
    return this;
  };

  private merge = (data: Partial<MoneyInput>): Money => {
    return new Money({ ...this._data, ...data });
  };

  private static formatNumber = (
    amount: number,
    subunit: boolean,
    locale: string | undefined,
    options: Parameters<typeof Intl.NumberFormat>[1] & { currency?: Currency },
  ): string => {
    let formattedValue = Intl.NumberFormat(locale, options).format(amount);
    if (!options?.currency) {
      return formattedValue;
    }

    if (options.currency === 'BTC') {
      formattedValue = formattedValue.replace('BTC', '').trim();
      if (subunit) {
        formattedValue = `${formattedValue}${currencyData.BTC.subunitSymbol}`;
      } else {
        formattedValue = `${currencyData.BTC.symbol}${formattedValue}`;
      }
      return formattedValue;
    }

    if (subunit) {
      const symbol = currencyData[options.currency].symbol;
      const subunitSymbol = currencyData[options.currency].subunitSymbol;
      return formattedValue.replace(symbol, subunitSymbol);
    }

    return formattedValue;
  };
}
