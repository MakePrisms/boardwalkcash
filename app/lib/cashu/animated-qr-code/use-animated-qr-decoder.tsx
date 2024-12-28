import { URDecoder } from '@ngraveio/bc-ur';
import { useEffect, useRef, useState } from 'react';

type Props = {
  fragment: string;
  onDecode?: (decodedText: string) => void;
};

export function useAnimatedQRDecoder({ fragment, onDecode }: Props) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const decoder = useRef<URDecoder | null>(null);
  decoder.current = new URDecoder();

  useEffect(() => {
    if (!decoder.current || fragment === '') return;

    try {
      decoder.current.receivePart(fragment);
      setProgress(decoder.current.estimatedPercentComplete() || 0);

      if (decoder.current.isComplete() && decoder.current.isSuccess()) {
        const ur = decoder.current.resultUR();
        const decoded = ur.decodeCBOR().toString('utf-8');
        onDecode?.(decoded);
      }
    } catch (e) {
      console.error('Failed to decode QR fragment', e);
      setError(
        e instanceof Error ? e : new Error('Failed to decode QR fragment'),
      );
    }
  }, [fragment, onDecode]);

  return {
    progress,
    error,
  };
}
