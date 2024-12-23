import { Big } from 'big.js';

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

type FormatOptions = {
  locale?: string;
  currency?: string;
};

type CurrencyUnit = {
  name: string;
  decimals: number;
  symbol: string;
  factor: Big;
  format: (value: number, options?: FormatOptions) => string;
};

type CurrencyData = {
  baseUnit: string;
  units: CurrencyUnit[];
};

type BaseFormatOptions = FormatOptions & { decimals: number };

function baseFormat(value: number, options: BaseFormatOptions) {
  const { locale, decimals, currency } = options;
  const formatOptions: Parameters<typeof Intl.NumberFormat>[1] = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (currency) {
    formatOptions.style = 'currency';
    formatOptions.currency = currency;
  }
  return Intl.NumberFormat(locale, formatOptions).format(value);
}

const currencyDataMap: Record<string, CurrencyData> = {
  USD: {
    baseUnit: 'usd',
    units: [
      {
        name: 'usd',
        decimals: 2,
        symbol: '$',
        factor: new Big(1),
        format: function (value: number, options: FormatOptions = {}) {
          return baseFormat(value, { ...options, decimals: this.decimals });
        },
      },
      {
        name: 'cent',
        decimals: 0,
        symbol: '¢',
        factor: new Big(10 ** -2),
        format: function (value: number, options: FormatOptions = {}) {
          let formattedValue = baseFormat(value, {
            ...options,
            decimals: this.decimals,
          });
          formattedValue = formattedValue.replace('$', '').trim();
          return `${formattedValue}${this.symbol}`;
        },
      },
    ],
  },
  BTC: {
    baseUnit: 'btc',
    units: [
      {
        name: 'btc',
        decimals: 8,
        symbol: '₿',
        factor: new Big(1),
        format: function (value: number, options: FormatOptions = {}) {
          let formattedValue = baseFormat(value, {
            ...options,
            decimals: this.decimals,
          });
          formattedValue = formattedValue.replace('BTC', '').trim();
          return `${this.symbol}${formattedValue}`;
        },
      },
      {
        name: 'sat',
        decimals: 0,
        symbol: '₿',
        factor: new Big(10 ** -8),
        format: function (value: number, options: FormatOptions = {}) {
          let formattedValue = baseFormat(value, {
            ...options,
            decimals: this.decimals,
          });
          formattedValue = formattedValue.replace('BTC', '').trim();
          return `${formattedValue}${this.symbol}`;
        },
      },
      {
        name: 'msat',
        decimals: 0,
        symbol: 'msat',
        factor: new Big(10 ** -11),
        format: function (value: number, options: FormatOptions = {}) {
          let formattedValue = baseFormat(value, {
            ...options,
            decimals: this.decimals,
          });
          formattedValue = formattedValue.replace('BTC', '').trim();
          return `${formattedValue} ${this.symbol}`;
        },
      },
    ],
  },
};

const getCurrencyBaseUnit = (currency: string) => {
  const currencyData = currencyDataMap[currency];
  if (!currencyData) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  const baseUnit = currencyData.units.find(
    (x) => x.name === currencyData.baseUnit,
  );
  if (!baseUnit) {
    throw new Error(`Misconfigured currency: ${currency}`);
  }
  return baseUnit;
};

type MoneyData = {
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

export class Money {
  private readonly _data: MoneyData;

  constructor(data: MoneyInput) {
    const { baseUnit, minUnit, selectedUnit } =
      Money.getCurrencyDataForInput(data);
    const unit = selectedUnit ?? baseUnit;

    const multiplier = unit.factor.div(minUnit.factor);
    const amountInMinUnit = new Big(data.amount).mul(multiplier);

    this._data = {
      amount: amountInMinUnit.round(minUnit.decimals, Big.roundDown),
      currency: data.currency,
      amountUnit: minUnit,
      initialUnit: unit,
    };

    Object.freeze(this);
    Object.freeze(this._data);
  }

  /**
   * Sum an array of moneys.
   *
   * If the array is empty, a currency must be specified so that 0 can be returned in that currency.
   *
   * The precision, etc., is based on the first item in the array.
   */
  static sum(moneys: Money[], currency?: string): Money {
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
    return money1.amount().cmp(money2.amount());
  }

  get currency(): string {
    return this._data.currency;
  }

  /**
   * Returns the currency symbol for the requested unit
   * @param unit Unit of currency. Default value is base unit (e.g. btc or usd)
   */
  getCurrencySymbol(unit?: string): string {
    return this.getCurrencyUnit(unit).symbol;
  }

  /**
   * Returns the money amount in the requested currency unit. If no unit is provided it uses the
   * default/base unit (bitcoin, dollar, ...).
   *
   * If the requested unit does not have enough precision the number will be rounded down to the number of decimals of
   * the requested unit. For example if the requested unit is 'btc' and the money instance has 4567 msat, the return
   * value will be 0.00000004
   *
   * @param unit The unit of the currency to use for the amount. Default is base currency unit (bitcoin for BTC, dollar
   * for USD, etc.)
   */
  amount = (unit?: string): Big => {
    const unitToCalculate = this.getCurrencyUnit(unit);
    const multiplier = this._data.amountUnit.factor.div(unitToCalculate.factor);
    return this._data.amount
      .mul(multiplier)
      .round(unitToCalculate.decimals, Big.roundDown);
  };

  multiply = (factor: NumberInput): Money => {
    const amount = this._data.amount.mul(factor);
    return this.merge({ amount });
  };

  /**
   * Divedes the money amount with the provided divisor.
   *
   * Note that dividing a monetary amount cannot be exact in all cases.
   * E.g. 10 USD / 3 = 3.33 USD
   *
   * The division is performed with a precision of 20 decimals before
   * rounding back to the monetary amount. (See https://mikemcl.github.io/big.js/#dp)
   */
  divide = (divisor: NumberInput): Money => {
    const amount = this._data.amount.div(divisor);
    return this.merge({ amount });
  };

  add = (money: Money): Money => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this.merge({ amount: this._data.amount.plus(amountInMinUnit) });
  };

  subtract = (money: Money): Money => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this.merge({ amount: this._data.amount.minus(amountInMinUnit) });
  };

  abs = (): Money => {
    return this.merge({ amount: this._data.amount.abs() });
  };

  equals = (money: Money): boolean => {
    return (
      this.currency === money.currency &&
      this._data.amount.eq(money.amount(this._data.amountUnit.name))
    );
  };

  greaterThan = (money: Money): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.gt(amountInMinUnit);
  };

  greaterThanOrEqual = (money: Money): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.gte(amountInMinUnit);
  };

  lessThan = (money: Money): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.lt(amountInMinUnit);
  };

  lessThanOrEqual = (money: Money): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.lte(amountInMinUnit);
  };

  isZero = (): boolean => {
    return this._data.amount.eq(0);
  };

  isPositive = (): boolean => {
    return this._data.amount.gt(0);
  };

  isNegative = (): boolean => {
    return this._data.amount.lt(0);
  };

  /**
   * Converts money to a regular javascript number for the requested currency unit.
   * If no unit is provided, base/default unit is used (bitcoin for BTC, dollar for USD, etc.)
   * Throws an error if it's not possible to keep full precision.
   */
  toNumber = (unit?: string): number => {
    // Don't use big.js toNumber because it sometimes returns -0.
    const str = this.toString(unit);
    const num = Number(str);

    if (
      str !==
      this.merge({
        amount: num,
        unit: unit ?? this.currencyData.baseUnit,
      }).toString(unit)
    ) {
      throw new Error('Converting to number was imprecise');
    }

    return num;
  };

  /**
   * Returns the money value as a stringified number without a currency.
   *
   * If you want to include the currency as well use `toLocaleString` instead.
   *
   * @param unit Specifies the currency unit to return. If not provided the base/default unit is used (bitcoin for BTC,
   * dollar for USD, etc.)
   */
  toString = (unit?: string): string => {
    const currencyUnit = this.getCurrencyUnit(unit);
    const amount = this.amount(currencyUnit.name);
    return amount.toFixed(currencyUnit.decimals);
  };

  /**
   * Returns the money value as a localized stringified number.
   * @param locale Locale to use to format the number. If not provided the locale of the machine will be used.
   * @param unit Specifies the currency unit to return. If not provided the base/default unit is used (bitcoin for BTC,
   * dollar for USD, etc.)
   * @param showCurrency Controls if the currency symbol should be included in the string. True by default
   */
  toLocaleString = ({
    locale,
    unit,
    showCurrency = true,
  }: {
    locale?: string;
    unit?: string;
    showCurrency?: boolean;
  } = {}): string => {
    const currencyUnit = this.getCurrencyUnit(unit);
    const options: FormatOptions = { locale };
    if (showCurrency) {
      options.currency = this.currency;
    }
    return currencyUnit.format(this.toNumber(unit), options);
  };

  toJSON = () => {
    return {
      amount: this.toNumber(),
      currency: this.currency,
    };
  };

  /**
   * Converts the money to the provided currency based on the provided exchange rate.
   * @param currency Currency to convert the money to (target currency)
   * @param exchangeRate Exchange rate to apply. The rate has to be in source/target currency format. E.g. if converting
   * USD to BTC, the rate should be in USD/BTC format. If converting BTC to usd it should be in USD/BTC format.
   */
  convert = (currency: string, exchangeRate: Big): Money => {
    const destinationCurrencyBaseUnit = getCurrencyBaseUnit(currency);
    const amount = this.amount()
      .mul(exchangeRate)
      .round(destinationCurrencyBaseUnit.decimals, Big.roundHalfUp);
    return new Money({ amount, currency });
  };

  private get currencyData(): CurrencyData {
    return currencyDataMap[this.currency];
  }

  private static getCurrencyDataForInput(data: MoneyInput): {
    baseUnit: CurrencyUnit;
    minUnit: CurrencyUnit;
    selectedUnit: CurrencyUnit | undefined;
  } {
    const currencyData = currencyDataMap[data.currency];
    if (!currencyData) {
      throw new Error(`Unsupported currency: ${data.currency}`);
    }

    const minUnit = currencyData.units.reduce((minItem, currentItem) => {
      return currentItem.factor.lt(minItem.factor) ? currentItem : minItem;
    });
    const baseUnit = currencyData.units.find(
      (x) => x.name === currencyData.baseUnit,
    );
    if (!minUnit || !baseUnit) {
      throw new Error(`Misconfigured currency: ${data.currency}`);
    }

    const selectedUnit = data.unit
      ? currencyData.units.find((x) => x.name === data.unit)
      : undefined;
    if (data.unit && !selectedUnit) {
      throw new Error(
        `Unsupported unit: ${data.unit} for currency ${data.currency}`,
      );
    }

    return { baseUnit, minUnit, selectedUnit };
  }

  private getCurrencyUnit = (
    unitName: string = this.currencyData.baseUnit,
  ): CurrencyUnit => {
    const currencyUnit = this.currencyData.units.find(
      (x) => x.name === unitName,
    );
    if (!currencyUnit) {
      throw new Error(
        `Unsupported unit: ${unitName} for currency ${this.currency}`,
      );
    }
    return currencyUnit;
  };

  private assertSameCurrency = (money: Money): Money => {
    if (money.currency !== this.currency) {
      throw new Error('Currencies must be the same');
    }
    return this;
  };

  private merge = (data: Partial<MoneyInput>): Money => {
    const { amountUnit, ...rest } = this._data;
    return new Money({ unit: amountUnit.name, ...rest, ...data });
  };
}
