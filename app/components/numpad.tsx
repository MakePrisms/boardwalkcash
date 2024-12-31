import { Delete } from 'lucide-react';
import { useCallback, useEffect } from 'react';

type NumpadButtonProps = React.ComponentPropsWithRef<'button'> & {
  onClick: () => void;
  children: React.ReactNode;
};

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
  onInvalidInput: () => void;
};

export const Numpad = ({
  value,
  showDecimal,
  onValueChange,
  onInvalidInput,
}: NumpadProps) => {
  const handleButtonClick = useCallback(
    (button: string) => {
      if (button === 'Backspace') {
        if (value === '0') {
          onInvalidInput();
          return;
        }
        const newValue = value.slice(0, -1);
        onValueChange(newValue === '' ? '0' : newValue);
        return;
      }

      if (button === '.') {
        // Only add decimal if one doesn't exist yet
        if (!value.includes('.')) {
          onValueChange(value + button);
        } else {
          onInvalidInput();
        }
        return;
      }

      // If we already have 2 decimal places, don't add more digits
      const decimalIndex = value.indexOf('.');
      if (decimalIndex !== -1 && value.length - decimalIndex > 2) {
        onInvalidInput();
        return;
      }

      if (button === '0' && value === '0') {
        onInvalidInput();
        return;
      }

      // replace 0 value with button value
      const newValue = value === '0' ? button : value + button;

      onValueChange(newValue);
    },
    [value, onValueChange, onInvalidInput],
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
