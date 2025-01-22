import { Delete } from 'lucide-react';
import { useCallback, useEffect } from 'react';

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
] as const;

const isValidButton = (button: string): button is (typeof buttons)[number] => {
  return buttons.includes(button as (typeof buttons)[number]);
};

type NumpadButtonProps = React.ComponentProps<'button'>;

const NumpadButton = ({ onClick, children, ...props }: NumpadButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-6 py-2 font-semibold text-2xl text-gray-800 transition-all active:scale-95 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-100"
      {...props}
    >
      {children}
    </button>
  );
};

type NumpadProps = {
  /** The current value displayed in the numpad */
  value: string;
  /** The maximum number of decimal places. If not provided, the numpad will not allow decimals */
  maxDecimals?: number;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Callback when invalid input is attempted */
  onInvalidInput: () => void;
};

export const Numpad = ({
  value,
  maxDecimals = 0,
  onValueChange,
  onInvalidInput,
}: NumpadProps) => {
  const handleButtonClick = useCallback(
    (button: (typeof buttons)[number]) => {
      if (button === 'Backspace') {
        if (value === '0') {
          return onInvalidInput();
        }

        const newValue = value.length === 1 ? '0' : value.slice(0, -1);
        return onValueChange(newValue);
      }

      const valueHasDecimal = value.includes('.');

      if (button === '.') {
        // Only add decimal if one doesn't exist yet
        return valueHasDecimal ? onInvalidInput() : onValueChange(`${value}.`);
      }

      const hasMaxDecimals =
        valueHasDecimal && value.length - value.indexOf('.') > maxDecimals;
      if (hasMaxDecimals) {
        return onInvalidInput();
      }

      if (button === '0' && value === '0') {
        return onInvalidInput();
      }

      // replace 0 value with button value
      const newValue = value === '0' ? button : value + button;

      onValueChange(newValue);
    },
    [value, onValueChange, onInvalidInput, maxDecimals],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key;
      if (isValidButton(key)) {
        handleButtonClick(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleButtonClick]);

  return (
    <div
      aria-label="Number pad"
      className="flex w-full flex-col items-center gap-4 sm:hidden"
    >
      <div className="grid w-full max-w-sm grid-cols-3 gap-4 sm:w-auto">
        {buttons.map((button) => {
          if (button === 'Backspace') {
            return (
              <NumpadButton
                key={button}
                aria-label="Delete last digit"
                value={button}
                onClick={() => handleButtonClick(button)}
              >
                <Delete className="h-6 w-6" aria-hidden="true" />
              </NumpadButton>
            );
          }

          if (button === '.' && maxDecimals === 0) {
            return <div key={button} />;
          }

          return (
            <NumpadButton
              key={button}
              value={button}
              aria-label={`${button} button`}
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
