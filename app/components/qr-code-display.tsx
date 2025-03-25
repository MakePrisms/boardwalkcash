import { AlertCircle, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';

export type QRCodeDisplayProps = {
  value?: string;
  description: string;
  error?: string;
  isLoading?: boolean;
  isSuccess?: boolean;
  successMessage?: string;
  onClick?: () => void;
  className?: string;
};

export function QRCodeDisplay({
  value,
  description,
  error,
  isLoading,
  isSuccess,
  successMessage,
  onClick,
  className,
}: QRCodeDisplayProps) {
  const baseClasses =
    'flex h-[256px] w-[256px] items-center justify-center rounded-lg';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-8',
        className,
      )}
    >
      {isSuccess ? (
        <div className={cn(baseClasses, 'bg-green-100 dark:bg-green-900')}>
          <div className="flex flex-col items-center justify-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-400" />
            {successMessage && (
              <p className="text-center font-medium text-green-600 dark:text-green-400">
                {successMessage}
              </p>
            )}
          </div>
        </div>
      ) : isLoading ? (
        <Skeleton className={baseClasses} />
      ) : value ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            baseClasses,
            'bg-foreground transition-transform active:scale-95',
          )}
        >
          <QRCodeSVG
            value={value}
            size={256}
            marginSize={3}
            className="rounded-lg bg-foreground"
          />
        </button>
      ) : (
        error && (
          <div className={cn(baseClasses, 'border bg-card')}>
            <div className="flex flex-col items-center justify-center gap-2 p-4">
              <AlertCircle className="h-8 w-8 text-foreground" />
              <p className="text-center text-muted-foreground text-sm">
                {error}
              </p>
            </div>
          </div>
        )
      )}

      <div className="w-[256px]">
        <p className="flex h-[32px] items-center justify-center text-center font-medium text-muted-foreground text-xs">
          {description}
        </p>
      </div>
    </div>
  );
}
