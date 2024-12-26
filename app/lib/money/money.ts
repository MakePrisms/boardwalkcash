import { Big } from 'big.js';
import type {
  BaseFormatOptions,
  Currency,
  CurrencyData,
  CurrencyDataMap,
  CurrencyUnit,
  FormatOptions,
  MoneyData,
  MoneyInput,
  NumberInput,
  UnitData,
} from './types';

function baseFormat(value: number, options: BaseFormatOptions) {
  const { locale, decimals, currency } = options;
  const formatOptions: Parameters<typeof Intl.NumberFormat>[1] = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (currency) {
    formatOptions.style = 'currency';
    formatOptions.currency = currency;
    formatOptions.currencyDisplay = 'narrowSymbol';
  }
  return Intl.NumberFormat(locale, formatOptions).format(value);
}

const currencyDataMap: CurrencyDataMap = {
  USD: {
    baseUnit: 'usd',
    units: [
      {
        name: 'usd',
        decimals: 2,
        symbol: '$',
        factor: new Big(1),
        format: function (value: number, options: FormatOptions = {}) {
          let formattedValue = baseFormat(value, {
            ...options,
            decimals: this.decimals,
          });
          formattedValue = formattedValue.replace('US', '').trim();
          return formattedValue;
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
          formattedValue = formattedValue
            .replace('$', '')
            .replace('US', '')
            .trim();
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

const getCurrencyBaseUnit = <T extends Currency>(currency: T) => {
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

export class Money<T extends Currency> {
  private readonly _data: MoneyData<T>;

  constructor(data: MoneyInput<T>) {
    const { baseUnit, minUnit, selectedUnit } =
      Money.getCurrencyDataForInput<T>(data);
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
  static sum<T extends Currency>(moneys: Money<T>[], currency?: T): Money<T> {
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

  static max<T extends Currency>(moneys: Money<T>[]): Money<T> {
    if (moneys.length === 0) {
      throw new Error('Need at least one money for comparison');
    }
    return moneys.reduce(
      (max, money) => (money.greaterThan(max) ? money : max),
      moneys[0],
    );
  }

  static min<T extends Currency>(moneys: Money<T>[]): Money<T> {
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
  static compare<T extends Currency>(
    money1: Money<T>,
    money2: Money<T>,
  ): number {
    money1.assertSameCurrency(money2);
    return money1.amount().cmp(money2.amount());
  }

  get currency(): T {
    return this._data.currency;
  }

  /**
   * Returns the currency symbol for the requested unit
   * @param unit Unit of currency. Default value is base unit (e.g. btc or usd)
   */
  getCurrencySymbol(unit?: CurrencyUnit<T>): string {
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
  amount = (unit?: CurrencyUnit<T>): Big => {
    const unitToCalculate = this.getCurrencyUnit(unit);
    const multiplier = this._data.amountUnit.factor.div(unitToCalculate.factor);
    return this._data.amount
      .mul(multiplier)
      .round(unitToCalculate.decimals, Big.roundDown);
  };

  multiply = (factor: NumberInput): Money<T> => {
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
  divide = (divisor: NumberInput): Money<T> => {
    const amount = this._data.amount.div(divisor);
    return this.merge({ amount });
  };

  add = (money: Money<T>): Money<T> => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this.merge({ amount: this._data.amount.plus(amountInMinUnit) });
  };

  subtract = (money: Money<T>): Money<T> => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this.merge({ amount: this._data.amount.minus(amountInMinUnit) });
  };

  abs = (): Money<T> => {
    return this.merge({ amount: this._data.amount.abs() });
  };

  equals = (money: Money<T>): boolean => {
    return (
      this.currency === money.currency &&
      this._data.amount.eq(money.amount(this._data.amountUnit.name))
    );
  };

  greaterThan = (money: Money<T>): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.gt(amountInMinUnit);
  };

  greaterThanOrEqual = (money: Money<T>): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.gte(amountInMinUnit);
  };

  lessThan = (money: Money<T>): boolean => {
    this.assertSameCurrency(money);
    const amountInMinUnit = money.amount(this._data.amountUnit.name);
    return this._data.amount.lt(amountInMinUnit);
  };

  lessThanOrEqual = (money: Money<T>): boolean => {
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
  toNumber = (unit?: CurrencyUnit<T>): number => {
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
  toString = (unit?: CurrencyUnit<T>): string => {
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
    unit?: CurrencyUnit<T>;
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
  convert = <U extends Currency>(
    currency: U,
    exchangeRate: NumberInput,
  ): Money<U> => {
    const destinationCurrencyBaseUnit = getCurrencyBaseUnit(currency);
    const amount = this.amount()
      .mul(exchangeRate)
      .round(destinationCurrencyBaseUnit.decimals, Big.roundHalfUp);
    return new Money({ amount, currency });
  };

  private get currencyData(): CurrencyData<T> {
    return currencyDataMap[this.currency];
  }

  private static getCurrencyDataForInput<T extends Currency>(
    data: MoneyInput<T>,
  ): {
    baseUnit: UnitData<T>;
    minUnit: UnitData<T>;
    selectedUnit: UnitData<T> | undefined;
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
    unitName: CurrencyUnit<T> = this.currencyData.baseUnit,
  ): UnitData<T> => {
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

  private assertSameCurrency = (money: Money<T>): Money<T> => {
    if (money.currency !== this.currency) {
      throw new Error('Currencies must be the same');
    }
    return this;
  };

  private merge = (data: Partial<MoneyInput<T>>): Money<T> => {
    const { amountUnit, ...rest } = this._data;
    return new Money({ unit: amountUnit.name, ...rest, ...data });
  };
}
