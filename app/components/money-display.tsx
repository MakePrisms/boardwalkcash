import type { ReactNode } from 'react';
import type { Currency, CurrencyUnit, Money } from '~/lib/money';
import { cn } from '~/lib/utils';

type MoneyDisplayBaseProps = {
  /** The symbol to display */
  symbol: string;
  /** Place the symbol before or after the number */
  symbolPosition: 'prefix' | 'suffix';
  /** The number to display */
  children: ReactNode;
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

function MoneyDisplayBase({
  symbol,
  symbolPosition,
  size = 'default',
  className,
  children,
}: MoneyDisplayBaseProps) {
  return (
    <div className={cn('inline-flex w-fit items-center', className)}>
      {symbolPosition === 'prefix' && (
        <span className={cn('font-bold', sizes[size].symbol)}>{symbol}</span>
      )}
      <span className={cn('font-bold font-numeric', sizes[size].value)}>
        {children}
      </span>
      {symbolPosition === 'suffix' && (
        <span className={cn('font-bold', sizes[size].symbol)}>{symbol}</span>
      )}
    </div>
  );
}

type MoneyDisplayProps<C extends Currency> = Omit<
  MoneyDisplayBaseProps,
  'symbol' | 'symbolPosition' | 'children'
> & {
  /** The money to display */
  money: Money<C>;
  /**
   * The number of decimal places entered
   *
   * If undefined, then no decimal places are shown.
   *
   * If not undefined, then we want to grey out the remaining decimal places.
   *
   * The difference between this value and the number of decimal places in the money object
   * is used to grey out the zeros.
   */
  decimalPlaces?: number;
  /**
   * If true, then `decimalPlaces` is ignored and the number is displayed as money.toLocaleString()
   */
  simpleFormat?: boolean;
} & (
    | {
        simpleFormat: true;
        decimalPlaces?: never;
      }
    | {
        simpleFormat?: false;
        decimalPlaces?: number;
      }
  );

export default function MoneyDisplay<C extends Currency>({
  money,
  decimalPlaces,
  simpleFormat = false,
  ...props
}: MoneyDisplayProps<C>) {
  // TODO: defined default format units for each currency somewhere
  const formatUnit =
    money.currency === 'BTC'
      ? ('sat' as CurrencyUnit<C>)
      : ('usd' as CurrencyUnit<C>);

  const symbol = money.getCurrencySymbol(formatUnit);
  const symbolPosition = money.getSymbolPosition(formatUnit);
  const formattedNumber = money.toLocaleString({
    unit: formatUnit,
    showCurrency: false,
  });

  const baseProps: Omit<MoneyDisplayBaseProps, 'children'> = {
    symbol,
    symbolPosition,
    ...props,
  };

  if (simpleFormat) {
    return (
      <MoneyDisplayBase {...baseProps}>{formattedNumber}</MoneyDisplayBase>
    );
  }

  const [moneyWhole, moneyDecimal = ''] = formattedNumber.split('.');
  let formattedDecimal: ReactNode | null = null;

  if (decimalPlaces !== undefined) {
    // If decimalPlaces is 0, it means user has only entered a decimal point after the whole number (ie. '5.'),
    // so we want to overwrite the entire decimal part; otherwise, overwrite the remaining decimal places
    const overwriteZerosCount =
      decimalPlaces === 0
        ? moneyDecimal.length
        : moneyDecimal.length - decimalPlaces;

    // Validate that we're not overwriting non-zero digits
    // This is to prevent users from entering a number like 1.23 and then overwriting the 2 and 3
    if (overwriteZerosCount > 0) {
      const digitsBeingOverwritten = moneyDecimal.slice(-overwriteZerosCount);
      if (digitsBeingOverwritten.split('').some((d) => d !== '0')) {
        throw new Error(
          `Cannot overwrite non-zero digits. decimal is ${moneyDecimal}, overwriteZerosCount is ${overwriteZerosCount}`,
        );
      }
    }

    // Format the decimal part with greyed zeros if needed
    formattedDecimal = moneyDecimal && (
      <span>
        .{moneyDecimal.slice(0, moneyDecimal.length - overwriteZerosCount)}
        {overwriteZerosCount > 0 && (
          <span className="text-gray-400">
            {'0'.repeat(overwriteZerosCount)}
          </span>
        )}
      </span>
    );
  }

  return (
    <MoneyDisplayBase {...baseProps}>
      {moneyWhole}
      {formattedDecimal}
    </MoneyDisplayBase>
  );
}
