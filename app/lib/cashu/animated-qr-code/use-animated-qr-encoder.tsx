import type { UREncoder } from '@gandlaf21/bc-ur';
import { useState } from 'react';
import { useInterval } from 'usehooks-ts';

type Props = {
  text: string;
  intervalMs?: number;
};

const maxFragmentLength = 200;
const firstSequenceNumber = 0;

function bufferFromUtf8(text: string) {
  return new Uint8Array(text.split('').map((c) => c.charCodeAt(0)));
}

export function useAnimatedQREncoder({ text, intervalMs = 200 }: Props) {
  const [fragment, setFragment] = useState<string>('');
  const [encoder, setEncoder] = useState<UREncoder | null>(() => {
    if (typeof window !== 'undefined') {
      // bc-ur has cborg as a dependency which fails to import on the server
      import('@gandlaf21/bc-ur').then(({ UR, UREncoder }) => {
        const messageBuffer = bufferFromUtf8(text);
        // @ts-expect-error - expects Buffer, but Uint8Array works
        const ur = UR.fromBuffer(messageBuffer);
        const instance = new UREncoder(
          ur,
          maxFragmentLength,
          firstSequenceNumber,
        );
        setEncoder(instance);
        // initialize with the first fragment
        // otherwise the QR renders an empty string for the first frame
        setFragment(instance.nextPart());
      });
    }
    // returns null, then when the promise resolves, the encoder is set
    return null;
  });

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
    isReady: text.length <= maxFragmentLength || Boolean(encoder),
  };
}
