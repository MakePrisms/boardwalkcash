// NUT-16 - animated QR code: https://github.com/cashubtc/nuts/blob/main/16.md

import { QRCodeSVG } from 'qrcode.react';
import { useAnimatedQREncoder } from './use-animated-qr-encoder';

type AnimatedQRCodeProps = {
  /**
   * The text to encode.
   */
  text: string;
  /**
   * The size, in pixels, to render the QR Code.
   *
   * @defaultValue 275
   */
  size?: number;
};

export function AnimatedQRCode({ text, size = 275 }: AnimatedQRCodeProps) {
  const { fragment, isReady } = useAnimatedQREncoder({ text });

  if (isReady) {
    return <QRCodeSVG value={fragment} size={size} />;
  }
}
