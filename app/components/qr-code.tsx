import { AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Skeleton } from '~/components/ui/skeleton';
import { AnimatedQRCode } from '~/lib/cashu/animated-qr-code';
import { cn } from '~/lib/utils';

type QRCodeProps = {
  /**
   * The value to display in the QR code.
   */
  value?: string;
  /**
   * The description to display below the QR code.
   */
  description?: string;
  /**
   * Whether the QR code should be animated.
   */
  animate?: boolean;
  /**
   * An error message to display if an error occurs when getting the value.
   */
  error?: string;
  /**
   * Whether to display a loading skeleton.
   */
  isLoading?: boolean;
  /**
   * The function to call when the QR code is clicked.
   */
  onClick?: () => void;
  className?: string;
};

/**
 * Displays a QR code with an optional description and various states.
 * If error is defined, the error will be displayed.
 * If isLoading is true, a skeleton will be displayed.
 * If the value prop is defined and there's no error, the QR code will be displayed.
 */
export function QRCode({
  value,
  description,
  animate,
  error,
  isLoading,
  onClick,
  className,
}: QRCodeProps) {
  const baseClasses =
    'flex h-[256px] w-[256px] items-center justify-center rounded-lg';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-8',
        className,
      )}
    >
      {error && (
        <div className={cn(baseClasses, 'border bg-card')}>
          <div className="flex flex-col items-center justify-center gap-2 p-4">
            <AlertCircle className="h-8 w-8 text-foreground" />
            <p className="text-center text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      )}

      {!error && isLoading && <Skeleton className={baseClasses} />}

      {!error && !isLoading && value && (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            baseClasses,
            'bg-foreground transition-transform active:scale-95',
          )}
        >
          {animate ? (
            <AnimatedQRCode
              value={value}
              size={256}
              marginSize={3}
              className="rounded-lg bg-foreground"
            />
          ) : (
            <QRCodeSVG
              value={value}
              size={256}
              marginSize={3}
              className="rounded-lg bg-foreground"
            />
          )}
        </button>
      )}

      {description && (
        <div className="w-[256px]">
          <p className="flex h-[32px] items-center justify-center text-center font-medium text-muted-foreground text-xs">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
