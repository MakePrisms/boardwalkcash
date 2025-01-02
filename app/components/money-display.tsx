import type { Currency, CurrencyUnit } from '~/lib/money';
import { Money } from '~/lib/money';
import { cn } from '~/lib/utils';

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

export interface MoneyInputDisplayProps {
  /** Raw input value from user (e.g., "1", "1.", "1.0") */
  inputValue: string;
  currency: Currency;
  unit: CurrencyUnit<Currency>;
  className?: string;
  size?: 'sm' | 'default';
  locale?: string;
}

export function MoneyInputDisplay({
  inputValue,
  currency,
  unit,
  locale,
  size = 'default',
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
    <span className={cn('font-bold', sizes[size].symbol)}>
      {currencySymbol}
    </span>
  );

  return (
    <div className={cn('inline-flex w-fit items-center', className)}>
      {currencySymbolPosition === 'prefix' && symbol}
      <span className={cn('font-bold font-numeric', sizes[size].value)}>
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
