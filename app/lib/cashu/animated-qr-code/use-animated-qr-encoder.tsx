import { UR, UREncoder } from '@ngraveio/bc-ur';
import { useRef } from 'react';
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
  const fragment = useRef<string>('');
  const encoder = useRef<UREncoder | null>(null);
  const messageBuffer = bufferFromUtf8(text);
  // @ts-expect-error - expects Buffer, but Uint8Array works
  const ur = UR.fromBuffer(messageBuffer);
  const instance = new UREncoder(ur, maxFragmentLength, firstSequenceNumber);
  encoder.current = instance;
  // initialize with the first fragment
  // otherwise the QR renders an empty string for the first frame
  fragment.current = encoder.current.nextPart();

  useInterval(
    () => {
      if (encoder.current) {
        fragment.current = encoder.current.nextPart();
      }
    },
    encoder.current ? intervalMs : null,
  );

  return {
    fragment: fragment.current,
    isReady: text.length <= maxFragmentLength || Boolean(encoder),
  };
}
