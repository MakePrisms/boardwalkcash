import { ArrowUpDown, Delete } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { type ExchangeRates, convertToUnit } from '~/lib/exchange-rate';
import { getUnitSymbol } from '~/lib/formatting';

export type InputUnit = 'usd' | 'sat';

type NumpadButtonProps = React.ComponentPropsWithRef<'button'> & {
  onClick: () => void;
  children: React.ReactNode;
};

const NumpadButton = ({ onClick, children, ...props }: NumpadButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-4 flex cursor-pointer items-center justify-center rounded-lg px-6 py-2 font-bold font-teko text-2xl transition-all active:scale-95"
      {...props}
    >
      {children}
    </button>
  );
};

const buttons = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '.',
  '0',
  'Backspace',
];

type NumpadProps = {
  value: string;
  showDecimal: boolean;
  onValueChange: (value: string) => void;
};

export const Numpad = ({ value, showDecimal, onValueChange }: NumpadProps) => {
  const handleButtonClick = useCallback(
    (button: string) => {
      if (button === 'Backspace') {
        onValueChange(value.slice(0, -1));
        return;
      }

      if (button === '.') {
        // Only add decimal if one doesn't exist yet and we're in USD mode
        if (!value.includes('.') && showDecimal) {
          onValueChange(value + button);
        }
        return;
      }

      // If we already have 2 decimal places, don't add more digits
      const decimalIndex = value.indexOf('.');
      if (decimalIndex !== -1 && value.length - decimalIndex > 2) {
        return;
      }

      if (button === '0' && value === '0') {
        return;
      }

      // replace 0 value with button value
      const newValue = value === '0' ? button : value + button;

      onValueChange(newValue);
    },
    [value, showDecimal, onValueChange],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key;
      if (buttons.includes(key) || key === 'Backspace') {
        handleButtonClick(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleButtonClick]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="grid w-full max-w-sm grid-cols-3 gap-4 sm:w-auto">
        {buttons.map((button) => {
          if (button === 'Backspace') {
            return (
              <NumpadButton
                key={button}
                onClick={() => handleButtonClick(button)}
              >
                <Delete className="h-6 w-6" />
              </NumpadButton>
            );
          }

          if (button === '.' && !showDecimal) {
            return <div key={button} />;
          }

          return (
            <NumpadButton
              key={button}
              onClick={() => handleButtonClick(button)}
            >
              {button}
            </NumpadButton>
          );
        })}
      </div>
    </div>
  );
};

type FormattedValue = {
  formattedValue: string;
  greyZeros: string;
};

const formatValue = (value: string, unit: InputUnit): FormattedValue => {
  const stringValue = value.toString();
  if (unit === 'usd') {
    // Handle case where input starts with decimal
    const val = stringValue.startsWith('.') ? `0${stringValue}` : stringValue;
    const numericValue = Number(val);

    if (val === '') return { formattedValue: '0', greyZeros: '' };

    // Check if value contains decimal
    const hasDecimal = val.includes('.');
    const decimalParts = val.split('.');

    if (!hasDecimal) {
      // Ensure numericValue is defined before calling toLocaleString
      if (typeof numericValue !== 'number' || Number.isNaN(numericValue)) {
        return { formattedValue: '0', greyZeros: '' };
      }
      return {
        formattedValue: numericValue.toLocaleString('en-US'),
        greyZeros: '',
      };
    }

    // Format with 2 decimal places if decimal exists
    const decimals = decimalParts[1] || '';
    const formatted = `${decimalParts[0]}.${decimals}`;
    const greyZerosCount = 2 - decimals.length;
    const greyZeros = greyZerosCount > 0 ? '0'.repeat(greyZerosCount) : '';

    return { formattedValue: formatted, greyZeros };
  }

  const val = stringValue.startsWith('.') ? `0${stringValue}` : stringValue;
  // Ensure val is a valid number before calling toLocaleString
  const num = Number(val);
  return {
    formattedValue:
      val === '' || Number.isNaN(num) ? '0' : num.toLocaleString('en-US'),
    greyZeros: '',
  };
};

type NumpadInputProps = {
  value: string;
  unit: InputUnit;
  rates: ExchangeRates;
};

export const NumpadInput = ({ value, unit, rates }: NumpadInputProps) => {
  const symbolPosition = unit === 'usd' ? 'prefix' : 'suffix';
  const oppositeUnit = unit === 'usd' ? 'sat' : 'usd';

  const { formattedValue, greyZeros } = useMemo(
    () => formatValue(value, unit),
    [value, unit],
  );

  const oppositeValue = useMemo(() => {
    if (!value) return formatValue('0', oppositeUnit);

    const numValue = Number(value);
    if (Number.isNaN(numValue)) return formatValue('0', oppositeUnit);

    const fromUnit = unit === 'usd' ? 'cent' : 'sat';
    const toUnit = oppositeUnit === 'usd' ? 'cent' : 'sat';

    // Convert based on units
    const convertedValue = convertToUnit(
      unit === 'usd' ? numValue * 100 : numValue, // Convert USD to cents
      fromUnit,
      toUnit,
      rates,
    );

    const displayValue =
      oppositeUnit === 'usd'
        ? (convertedValue / 100).toString()
        : // Convert cents back to USD
          convertedValue.toString();

    return formatValue(displayValue, oppositeUnit);
  }, [value, unit, oppositeUnit, rates]);

  return (
    <div>
      <div className="inline-flex w-fit items-center">
        {symbolPosition === 'prefix' && (
          <span className="font-bold text-[3.45rem]">
            {getUnitSymbol(unit)}
          </span>
        )}
        <span className={'pt-2 font-bold font-teko text-6xl'}>
          {formattedValue}
          {greyZeros && <span className="text-gray-400">{greyZeros}</span>}
        </span>
        {symbolPosition === 'suffix' && (
          <span className="font-bold text-[3.45rem]">
            {getUnitSymbol(unit)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 text-gray-500">
        <span>
          {oppositeUnit === 'usd' &&
            oppositeValue.formattedValue !== '0' &&
            '~'}
          {getUnitSymbol(oppositeUnit)}
          {oppositeValue.formattedValue}
          {oppositeValue.greyZeros || ''}
        </span>
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </div>
  );
};
