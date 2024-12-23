import type { Buffer } from 'node:buffer';
import type { UREncoder } from '@gandlaf21/bc-ur';
import { useEffect, useState } from 'react';
import { useInterval } from '~/lib/use-interval';

type Props = {
  text: string;
  intervalMs?: number;
};

export function useAnimatedQREncoder({ text, intervalMs = 200 }: Props) {
  const [fragment, setFragment] = useState<string>('');
  const [encoder, setEncoder] = useState<UREncoder | null>(null);

  const maxFragmentLength = 150;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // need to import here because the UREncoder requires a cbor library that only works in the browser
    import('@gandlaf21/bc-ur').then((bcUr) => {
      const { UR, UREncoder } = bcUr;

      const messageBuffer = new Uint8Array(
        text.split('').map((c) => c.charCodeAt(0)),
      );
      const ur = UR.fromBuffer(messageBuffer as Buffer);

      const firstSequenceNumber = 0;

      const encoder = new UREncoder(ur, maxFragmentLength, firstSequenceNumber);
      setEncoder(encoder);

      // Initialize with the first fragment
      setFragment(encoder.nextPart());
    });
  }, [text]);

  useInterval(
    () => {
      if (encoder) {
        setFragment(encoder.nextPart());
      }
    },
    encoder ? intervalMs : null,
  );

  return {
    fragment,
    isReady: text.length <= 150 || Boolean(encoder),
  };
}
