import type { Currency, CurrencyUnit } from '~/lib/money';
import { Money } from '~/lib/money';
import { cn } from '~/lib/utils';

export interface MoneyInputDisplayProps {
  /** Raw input value from user (e.g., "1", "1.", "1.0") */
  inputValue: string;
  currency: Currency;
  unit: CurrencyUnit<Currency>;
  className?: string;
  locale?: string;
}

export function MoneyInputDisplay({
  inputValue,
  currency,
  unit,
  locale,
  className,
}: MoneyInputDisplayProps) {
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
    <span className="font-bold text-[3.45rem]">{currencySymbol}</span>
  );

  return (
    <div className={cn('inline-flex w-fit items-center', className)}>
      {currencySymbolPosition === 'prefix' && symbol}
      <span className="pt-2 font-bold font-numeric text-6xl">
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
    </div>
  );
}

type MoneyDisplayProps = {
  money: Money<Currency>;
  locale?: string;
  unit?: CurrencyUnit<Currency>;
  size?: 'sm' | 'default';
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

export function MoneyDisplay({
  money,
  locale,
  unit,
  size = 'default',
}: MoneyDisplayProps) {
  const {
    currencySymbol,
    currencySymbolPosition,
    integer,
    decimalSeparator,
    fraction,
  } = money.toLocalizedStringParts({ locale, unit });

  const symbol = (
    <span className={cn('font-bold', sizes[size].symbol)}>
      {currencySymbol}
    </span>
  );

  return (
    <div className={cn('inline-flex w-fit items-center')}>
      {currencySymbolPosition === 'prefix' && symbol}
      <span className={cn('font-bold font-numeric', sizes[size].value)}>
        {integer}
        {fraction && (
          <>
            <span>{decimalSeparator}</span>
            <span>{fraction}</span>
          </>
        )}
      </span>
      {currencySymbolPosition === 'suffix' && symbol}
    </div>
  );
}
