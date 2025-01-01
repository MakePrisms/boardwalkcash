// NUT-16 - animated QR code: https://github.com/cashubtc/nuts/blob/main/16.md

import { QRCodeSVG } from 'qrcode.react';
import { useAnimatedQREncoder } from './use-animated-qr-encoder';

type Props = {
  text: string;
  size?: number;
};

export function AnimatedQRCode({ text, size = 275 }: Props) {
  const { fragment, isReady } = useAnimatedQREncoder({ text });

  if (isReady) {
    return <QRCodeSVG value={fragment} size={size} />;
  }
}

export default AnimatedQRCode;
