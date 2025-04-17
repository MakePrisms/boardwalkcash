import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { AlertCircle, Banknote, Link } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';
import { useState } from 'react';
import { useLoaderData } from 'react-router';
import { useCopyToClipboard } from 'usehooks-ts';
import { PageContent } from '~/components/page';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '~/components/ui/carousel';
import { Skeleton } from '~/components/ui/skeleton';
import { useToast } from '~/hooks/use-toast';
import { AnimatedQRCode } from '~/lib/cashu/animated-qr-code';
import type { Money } from '~/lib/money';
import { cn } from '~/lib/utils';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';

// TODO: I have a similar QR code and carousel component abstraction in progress
// We shoul use that instead here

type QRCarouselItemProps = {
  value?: string;
  description: string;
  error?: string;
  isLoading?: boolean;
  animate?: boolean;
  onClick?: () => void;
};

function QRCarouselItem({
  value,
  description,
  error,
  isLoading,
  animate,
  onClick,
}: QRCarouselItemProps) {
  const baseClasses =
    'flex h-[256px] w-[256px] items-center justify-center rounded-lg cursor-pointer';

  return (
    <CarouselItem>
      <div className="flex flex-col items-center justify-center gap-8">
        {isLoading ? (
          <Skeleton className={baseClasses} />
        ) : value ? (
          <button
            type="button"
            onClick={onClick}
            className={cn(
              baseClasses,
              'bg-foreground transition-transform active:scale-95',
            )}
          >
            {animate ? (
              <AnimatedQRCode
                size={256}
                className="rounded-lg bg-foreground"
                value={value}
                marginSize={3}
              />
            ) : (
              <QRCodeSVG
                size={256}
                marginSize={3}
                className="rounded-lg bg-foreground"
                value={value}
              />
            )}
          </button>
        ) : (
          error && (
            <div className={cn(baseClasses, 'border bg-card')}>
              <div className="flex flex-col items-center justify-center gap-2 p-4">
                <AlertCircle className="h-8 w-8 text-foreground" />
                <p className="text-center text-muted-foreground text-sm">
                  {error}
                </p>
              </div>
            </div>
          )
        )}
        <div className="w-[256px]">
          <p className="flex h-[32px] items-center justify-center text-center font-medium text-muted-foreground text-xs">
            {description}
          </p>
        </div>
      </div>
    </CarouselItem>
  );
}

function useCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollToIndex = (index: number) => {
    api?.scrollTo(index);
  };

  return { current, scrollToIndex, setApi };
}

/** Two buttons to flip back and forth between the two QR codes. */
function CarouselControls({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="flex rounded-full border">
        <button
          type="button"
          className={`rounded-full px-6 py-3 ${
            current === 0 ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => onSelect(0)}
        >
          <Link className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={`rounded-full px-6 py-3 ${
            current === 1 ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => onSelect(1)}
        >
          <Banknote className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

type Props = {
  token: Token;
  amount: Money;
};

export function ShareCashuToken({ token, amount }: Props) {
  const { toast } = useToast();
  const { origin } = useLoaderData() as { origin: string };
  const { current, scrollToIndex, setApi } = useCarousel();
  const [, copyToClipboard] = useCopyToClipboard();

  const encodedToken = getEncodedToken(token);
  const shareableLink = `${origin}/receive/cashu-token#${encodedToken}`;
  const shortToken = `${encodedToken.slice(0, 6)}...${encodedToken.slice(-5)}`;
  const shortShareableLink = `${origin}/receive/cashu-token#${shortToken}`;

  return (
    <PageContent className="items-center gap-0 overflow-x-hidden overflow-y-hidden">
      <MoneyWithConvertedAmount money={amount} />
      <div className="flex w-full flex-col items-center justify-center px-4 py-4 pb-8">
        <Carousel setApi={setApi} opts={{ align: 'center', loop: true }}>
          <CarouselContent>
            <QRCarouselItem
              value={shareableLink}
              description="Click to copy Shareable Link"
              onClick={() => {
                copyToClipboard(shareableLink);
                toast({
                  title: 'Copied Shareable Link to clipboard',
                  description: shortShareableLink,
                });
              }}
            />
            <QRCarouselItem
              value={encodedToken}
              description="Click to copy eCash Token"
              animate={true}
              onClick={() => {
                copyToClipboard(encodedToken);
                toast({
                  title: 'Copied eCash Token to clipboard',
                  description: shortToken,
                });
              }}
            />
          </CarouselContent>
        </Carousel>
        <CarouselControls current={current} onSelect={scrollToIndex} />
      </div>
    </PageContent>
  );
}
