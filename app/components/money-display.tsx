import type { ReactNode } from 'react';
import type { AppCurrency } from '~/hooks/use-exchange-rate';
import type { CurrencyUnit, Money } from '~/lib/money';

type MoneyDisplayProps<C extends AppCurrency> = {
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
  className?: string;
  size?: 'sm' | 'lg';
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

const sizes = {
  sm: {
    symbol: 'text-[1.2rem]',
    value: 'text-2xl pt-1',
  },
  lg: {
    symbol: 'text-[3.45rem]',
    value: 'text-6xl pt-2',
  },
} as const;

export const MoneyDisplay = <C extends AppCurrency>({
  money,
  decimalPlaces,
  className = '',
  size = 'lg',
  simpleFormat = false,
}: MoneyDisplayProps<C>) => {
  let formatUnit: CurrencyUnit<C>;
  if (money.currency === 'BTC') {
    formatUnit = 'sat' as CurrencyUnit<C>;
  } else {
    formatUnit = 'usd' as CurrencyUnit<C>;
  }

  // find the symbol position
  const localeString = money.toLocaleString({ unit: formatUnit });
  const symbol = money.getCurrencySymbol();
  const symbolPosition = localeString.startsWith(symbol) ? 'prefix' : 'suffix';

  const formattedNumber = money.toLocaleString({
    unit: formatUnit,
    showCurrency: false,
  });

  const [whole, decimal = ''] = formattedNumber.split('.');

  let greyZerosCount = 0;
  let formattedDecimal: ReactNode | null = null;

  if (decimalPlaces !== undefined) {
    if (decimalPlaces === 0) {
      // If decimalPlaces is 0, it means user has only entered a decimal point (ie. '5.')
      // So we want to grey out the entire decimal part
      greyZerosCount = decimal.length;
    } else {
      // grey out the remaining decimal places
      greyZerosCount = decimal.length - decimalPlaces;
    }

    // Validate that we're not hiding non-zero digits
    // This is to prevent users from entering a number like 1.23 and then greying out the 2 and 3
    if (greyZerosCount > 0) {
      const lastDigits = decimal.slice(-greyZerosCount);
      if (lastDigits.split('').some((digit) => digit !== '0')) {
        throw new Error('Cannot grey out non-zero digits');
      }
    }

    // Format the decimal part with greyed zeros if needed
    formattedDecimal = decimal && (
      <span>
        .{decimal.slice(0, decimal.length - greyZerosCount)}
        {greyZerosCount > 0 && (
          <span className="text-gray-400">{'0'.repeat(greyZerosCount)}</span>
        )}
      </span>
    );
  }

  return (
    <div className={`inline-flex w-fit items-center ${className}`}>
      {symbolPosition === 'prefix' && (
        <span className={`font-bold ${sizes[size].symbol}`}>{symbol}</span>
      )}
      <span className={`font-bold font-numeric ${sizes[size].value}`}>
        {simpleFormat ? (
          formattedNumber
        ) : (
          <>
            {whole}
            {formattedDecimal}
          </>
        )}
      </span>
      {symbolPosition === 'suffix' && (
        <span className={`font-bold ${sizes[size].symbol}`}>{symbol}</span>
      )}
    </div>
  );
};
