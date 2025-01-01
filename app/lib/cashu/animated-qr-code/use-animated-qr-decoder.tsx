import { URDecoder } from '@jbojcic/bc-ur';
import { useEffect, useState } from 'react';

type Props = {
  fragment: string;
  onDecode?: (decodedText: string) => void;
};

export function useAnimatedQRDecoder({ fragment, onDecode }: Props) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [decoder] = useState(() => new URDecoder());

  useEffect(() => {
    if (fragment === '') return;

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
