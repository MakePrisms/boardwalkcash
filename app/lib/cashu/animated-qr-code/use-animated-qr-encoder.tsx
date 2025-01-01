import { UR, UREncoder } from '@jbojcic/bc-ur';
import { useEffect, useState } from 'react';
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
  const [encoder, setEncoder] = useState<UREncoder>();

  useEffect(() => {
    const messageBuffer = bufferFromUtf8(text);
    // @ts-expect-error - expects Buffer, but Uint8Array works
    const ur = UR.fromBuffer(messageBuffer);
    const instance = new UREncoder(ur, maxFragmentLength, firstSequenceNumber);
    setEncoder(instance);
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
    isReady: text.length <= maxFragmentLength,
  };
}
