import '~/components/qr-scanner/qr-scanner.css';
import Scanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';
import { useAnimatedQRDecoder } from '~/lib/cashu/animated-qr-code';

const AnimatedScanProgress = ({ progress }: { progress: number }) => {
  if (progress === 0) return null;

  return (
    <div className="absolute right-0 bottom-0 left-0 p-2">
      <div className="relative h-8 w-full rounded bg-gray-700">
        <div
          className="h-full rounded bg-secondary transition-all"
          style={{ width: `${progress * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-white">
            {Math.round(progress * 100)}%
            {progress > 0.9 ? ' - Keep scanning' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

type Props = {
  onDecode: (decoded: string) => void;
};

export const QRScanner = ({ onDecode }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanner = useRef<Scanner | null>(null);
  const [currentFragment, setCurrentFragment] = useState('');

  const { progress } = useAnimatedQRDecoder({
    fragment: currentFragment,
    onDecode: (decoded) => {
      setCurrentFragment('');
      onDecode(decoded);
      scanner.current?.stop();
    },
  });

  useEffect(() => {
    const handleResult = (result: Scanner.ScanResult): void => {
      if (result.data.toLowerCase().startsWith('ur:')) {
        setCurrentFragment(result.data);
      } else {
        onDecode(result.data);
        scanner.current?.stop();
      }
    };

    if (!videoRef.current) return;

    scanner.current = new Scanner(videoRef.current, handleResult, {
      returnDetailedScanResult: true,
      highlightScanRegion: true,
      highlightCodeOutline: true,
    });

    scanner.current.start();

    return () => {
      scanner.current?.stop();
    };
  }, [onDecode]);

  return (
    <section className="aspect-square h-full w-full max-w-[100vw] md:max-w-[400px]">
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          aria-label="QR code scanner"
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        <AnimatedScanProgress progress={progress} />
      </div>
    </section>
  );
};
