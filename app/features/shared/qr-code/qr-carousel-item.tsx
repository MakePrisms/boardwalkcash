import { CarouselItem } from '~/components/ui/carousel';
import { QRCodeDisplay, type QRCodeDisplayProps } from './qr-code-display';

export type QRCarouselItemProps = Omit<QRCodeDisplayProps, 'className'>;

export function QRCarouselItem(props: QRCarouselItemProps) {
  return (
    <CarouselItem>
      <QRCodeDisplay {...props} />
    </CarouselItem>
  );
}
