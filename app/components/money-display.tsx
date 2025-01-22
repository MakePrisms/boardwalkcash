import type { Currency, CurrencyUnit } from '~/lib/money';
import { Money } from '~/lib/money';
import { cn } from '~/lib/utils';

export interface MoneyInputDisplayProps<C extends Currency = Currency> {
  /** Raw input value from user (e.g., "1", "1.", "1.0") */
  inputValue: string;
  currency: C;
  unit: CurrencyUnit<C>;
  locale?: string;
}

export function MoneyInputDisplay<C extends Currency>({
  inputValue,
  currency,
  unit,
  locale,
}: MoneyInputDisplayProps<C>) {
  const money = new Money({ amount: inputValue, currency, unit });
  const {
    currencySymbol,
    currencySymbolPosition,
    integer,
    numberOfDecimals,
    decimalSeparator,
  } = money.toLocalizedStringParts({
    locale,
    unit,
    minimumFractionDigits: 'max',
  });

  // Get decimal part of the input value
  const inputHasDecimalPoint = decimalSeparator
    ? inputValue.includes(decimalSeparator)
    : false;
  const inputDecimals = inputHasDecimalPoint
    ? inputValue.split(decimalSeparator)[1]
    : '';

  // If decimal part exists in the input value, pad with zeros to numberOfDecimals places
  const needsPaddedZeros =
    inputHasDecimalPoint && inputDecimals.length < numberOfDecimals;
  const paddedZeros = needsPaddedZeros
    ? '0'.repeat(numberOfDecimals - inputDecimals.length)
    : '';

  const symbol = (
    <span className="text-[3.45rem] text-currencySymbol">{currencySymbol}</span>
  );

  return (
    <span className="font-bold">
      {currencySymbolPosition === 'prefix' && symbol}
      <span className="pt-2 font-numeric text-6xl">
        {integer}
        {(inputDecimals || needsPaddedZeros) && (
          <>
            <span>{decimalSeparator}</span>
            <span>{inputDecimals}</span>
            {paddedZeros && (
              <span className="text-gray-400">{paddedZeros}</span>
            )}
          </>
        )}
      </span>
      {currencySymbolPosition === 'suffix' && symbol}
    </span>
  );
}

type MoneyDisplayProps<C extends Currency = Currency> = {
  money: Money<C>;
  locale?: string;
  unit?: CurrencyUnit<C>;
  size?: 'sm' | 'default';
  className?: string;
};

const sizes = {
  sm: {
    symbol: 'text-[1.2rem]',
    value: 'text-2xl pt-1',
  },
  default: {
    symbol: 'text-[3.45rem]',
    value: 'text-6xl pt-2',
  },
} as const;

export function MoneyDisplay<C extends Currency>({
  money,
  locale,
  unit,
  size = 'default',
  className,
}: MoneyDisplayProps<C>) {
  const {
    currencySymbol,
    currencySymbolPosition,
    integer,
    decimalSeparator,
    fraction,
  } = money.toLocalizedStringParts({ locale, unit });

  const value = `${integer}${decimalSeparator}${fraction}`;

  const symbol = (
    <span className={cn(sizes[size].symbol, 'text-currencySymbol')}>
      {currencySymbol}
    </span>
  );

  return (
    <span className={cn('font-bold', className)}>
      {currencySymbolPosition === 'prefix' && symbol}
      <span className={cn('font-numeric', sizes[size].value)}>{value}</span>
      {currencySymbolPosition === 'suffix' && symbol}
    </span>
  );
}
