import { Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '~/lib/utils';

const bgColor = '#FFFFFF';
const fgColor = '#000000';
const marginSize = 3;

const commonStyles = cn('rounded-lg', 'flex items-center justify-center');

type QRCodeProps = {
  /**
   * The value to encode into the QR Code. An array of strings can be
   * passed in to represent multiple segments to further optimize the QR Code.
   */
  value: string;
  /**
   * The size of the QR Code in pixels.
   *
   * @defaultValue 128
   */
  size?: number;
  className?: string;
};

export function QRCode({ value, size = 128, className }: QRCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      className={cn(commonStyles, className)}
      marginSize={marginSize}
      bgColor={bgColor}
      fgColor={fgColor}
    />
  );
}

type QRCodeWithLoadingStateProps = {
  /**
   * The value to encode into the QR Code. An array of strings can be
   * passed in to represent multiple segments to further optimize the QR Code.
   *
   * If not provided, the QR Code will be in a loading state.
   */
  value?: string;
  /**
   * The size of the QR Code in pixels.
   *
   * @defaultValue 128
   */
  size?: number;
  className?: string;
};

export function QRCodeWithLoadingState({
  value,
  size = 128,
  className,
}: QRCodeWithLoadingStateProps) {
  const numCells = size;

  if (value === undefined) {
    // this creates the same SVG as the QRCodeSVG component, but with a loading state
    return (
      <svg
        height={size}
        width={size}
        viewBox={`0 0 ${numCells} ${numCells}`}
        className={cn(commonStyles, className)}
        role="img"
      >
        <title>Loading...</title>
        <path fill={bgColor} d={`M0,0 h${numCells}v${numCells}H0z`} />
        <foreignObject
          x={numCells / 2 - numCells * 0.2}
          y={numCells / 2 - numCells * 0.2}
          width={numCells * 0.4}
          height={numCells * 0.4}
        >
          <div className="flex h-full w-full items-center justify-center">
            <Loader2
              className="animate-spin"
              color={fgColor}
              size={numCells * 0.4}
            />
          </div>
        </foreignObject>
      </svg>
    );
  }

  return <QRCode value={value} size={size} className={className} />;
}
