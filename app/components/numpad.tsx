import { Delete } from 'lucide-react';
import { useEffect } from 'react';

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

export type NumpadButton = (typeof buttons)[number];

const isValidButton = (button: string): button is NumpadButton => {
  return (buttons as readonly string[]).includes(button);
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
  /** Whether to show the decimal button */
  showDecimal: boolean;
  /** Callback when a button is clicked */
  onButtonClick: (button: NumpadButton) => void;
};

/** A component that displays a numpad and handles keyboard input */
export const Numpad = ({ showDecimal, onButtonClick }: NumpadProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key;
      if (isValidButton(key)) {
        onButtonClick(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onButtonClick]);

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
                aria-label="Delete"
                value={button}
                onClick={() => onButtonClick(button)}
              >
                <Delete className="h-6 w-6" aria-hidden="true" />
              </NumpadButton>
            );
          }

          if (button === '.' && !showDecimal) {
            return <div key={button} />;
          }

          return (
            <NumpadButton
              key={button}
              value={button}
              onClick={() => onButtonClick(button)}
            >
              {button}
            </NumpadButton>
          );
        })}
      </div>
    </div>
  );
};
