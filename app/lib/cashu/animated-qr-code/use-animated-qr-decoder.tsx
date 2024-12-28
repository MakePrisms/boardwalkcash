import type { URDecoder } from '@gandlaf21/bc-ur';
import { useEffect, useState } from 'react';

type Props = {
  fragment: string;
  onDecode?: (decodedText: string) => void;
};

export function useAnimatedQRDecoder({ fragment, onDecode }: Props) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [decoder, setDecoder] = useState<URDecoder | null>(() => {
    // bc-ur has cborg as a dependency which fails to import on the server
    if (typeof window !== 'undefined') {
      import('@gandlaf21/bc-ur').then(({ URDecoder }) => {
        setDecoder(new URDecoder());
      });
    }
    // returns null, then when the promise resolves, the decoder is set
    return null;
  });

  useEffect(() => {
    if (!decoder || fragment === '') return;

    try {
      decoder.receivePart(fragment);
      setProgress(decoder.estimatedPercentComplete() || 0);

      if (decoder.isComplete() && decoder.isSuccess()) {
        const ur = decoder.resultUR();
        const decoded = ur.decodeCBOR().toString();
        onDecode?.(decoded);
      }
    } catch (e) {
      console.error('Failed to decode QR fragment', e);
      setError(
        e instanceof Error ? e : new Error('Failed to decode QR fragment'),
      );
    }
  }, [fragment, onDecode, decoder]);

  return {
    progress,
    error,
  };
}
