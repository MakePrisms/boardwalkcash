import { useEffect } from 'react';
import type { Currency, CurrencyUnit } from '~/lib/money';
import { Money } from '~/lib/money';
import { cn } from '~/lib/utils';
import { type NumpadButton, isValidNumpadButton } from './numpad';

interface MoneyInputDisplayProps<C extends Currency = Currency> {
  /** Raw input value from user (e.g., "1", "1.", "1.0") */
  inputValue: string;
  currency: C;
  unit: CurrencyUnit<C>;
  locale?: string;
  onNumpadInput?: (button: NumpadButton) => void;
  /** ID for the input element for accessibility connections */
  inputId?: string;
  /** ID for ARIA describedby connections */
  ariaDescribedBy?: string;
}

export function MoneyInputDisplay<C extends Currency>({
  inputValue,
  currency,
  unit,
  locale,
  onNumpadInput,
  inputId,
  ariaDescribedBy,
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

  // Global keyboard listener for numpad input
  useEffect(() => {
    if (!onNumpadInput) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard input if another input element is focused
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('contenteditable') === 'true');

      if (isInputFocused) {
        return;
      }

      const key = event.key;
      if (isValidNumpadButton(key)) {
        onNumpadInput(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNumpadInput]);

  return (
    <div className="relative font-bold">
      {currencySymbolPosition === 'prefix' && symbol}

      {/* Semantic input for accessibility - keyboard input handled by useEffect */}
      <input
        type="text"
        inputMode="decimal"
        id={inputId}
        value={inputValue}
        className="absolute inset-0 h-full w-full caret-transparent opacity-0"
        aria-label={`Amount input in ${currency}`}
        aria-describedby={ariaDescribedBy}
        readOnly={true} // Prevent direct input, handled by keyboard listener
        tabIndex={0} // Keep focusable for accessibility
        autoComplete="off"
      />

      {/* Visual display */}
      <span
        className="pointer-events-none pt-2 font-numeric text-6xl"
        aria-hidden="true" // Prevent screen readers from reading
      >
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

type MoneyDisplayProps<C extends Currency = Currency> = {
  money: Money<C>;
  locale?: string;
  unit?: CurrencyUnit<C>;
  variant?: 'default' | 'secondary';
  className?: string;
};

const variants = {
  default: {
    symbol: 'text-[3.45rem] text-currencySymbol',
    value: 'text-6xl pt-2',
    wrapper: 'font-bold',
  },
  secondary: {
    symbol: 'text-[1.33rem] text-foreground',
    value: 'text-2xl pt-1 text-foreground',
    wrapper: 'font-semibold',
  },
} as const;

export function MoneyDisplay<C extends Currency>({
  money,
  locale,
  unit,
  variant = 'default',
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
    <span className={variants[variant].symbol}>{currencySymbol}</span>
  );

  return (
    <span className={cn(variants[variant].wrapper, className)}>
      {currencySymbolPosition === 'prefix' && symbol}
      <span className={cn('font-numeric', variants[variant].value)}>
        {value}
      </span>
      {currencySymbolPosition === 'suffix' && symbol}
    </span>
  );
}
