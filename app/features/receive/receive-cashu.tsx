import { AlertCircle, Banknote, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '~/components/ui/carousel';
import { Skeleton } from '~/components/ui/skeleton';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { cn } from '~/lib/utils';
import type { Account, CashuAccount } from '../accounts/account';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { useCreateCashuReceiveQuote } from './cashu-receive-quote';
import { getCashuRequest } from './reusable-payment-request';
type QRCarouselItemProps = {
  value?: string;
  description: string;
  error?: string;
  isLoading?: boolean;
  onClick?: () => void;
};

function QRCarouselItem({
  value,
  description,
  error,
  isLoading,
  onClick,
}: QRCarouselItemProps) {
  const baseClasses =
    'flex h-[256px] w-[256px] items-center justify-center rounded-lg';

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
            {' '}
            <QRCodeSVG
              value={value}
              size={256}
              marginSize={3}
              className="rounded-lg bg-foreground"
            />
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

type CashuRequestQRProps = {
  account: CashuAccount;
  amount: Money;
};

function CashuRequestQRItem({ account, amount }: CashuRequestQRProps) {
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  // TODO: this should come from some hook that does a similar thing to the mint quote hook
  const cashuRequest = getCashuRequest(account, {
    amount,
    unit: cashuUnit,
    singleUse: true,
  }).toEncodedRequest();

  return (
    <QRCarouselItem
      value={cashuRequest}
      description="Scan with any wallet that supports Cashu payment requests."
      onClick={() => {
        copyToClipboard(cashuRequest);
        toast({
          title: 'Copied Cashu Payment Request',
          description: `${cashuRequest?.slice(0, 5)}...${cashuRequest?.slice(-5)}`,
        });
      }}
    />
  );
}

type MintQuoteProps = {
  account: CashuAccount;
  amount: Money;
  isVisible: boolean;
};

function MintQuoteItem({ account, amount, isVisible }: MintQuoteProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const {
    mutate: createQuote,
    isPending,
    data: quote,
    error,
  } = useCreateCashuReceiveQuote();

  const { toast } = useToast();

  useEffect(() => {
    if (isVisible && !quote) {
      createQuote({ account, amount });
    }
  }, [isVisible, createQuote, quote, account, amount]);

  return (
    <QRCarouselItem
      value={quote?.paymentRequest}
      description="Scan with any Lightning wallet."
      error={error?.message}
      isLoading={isPending}
      onClick={
        quote?.paymentRequest
          ? () => {
              copyToClipboard(quote.paymentRequest);
              toast({
                title: 'Copied BOLT11 Lightning Invoice',
                description: `${quote.paymentRequest.slice(0, 5)}...${quote.paymentRequest.slice(-5)}`,
              });
            }
          : undefined
      }
    />
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
          <Banknote className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={`rounded-full px-6 py-3 ${
            current === 1 ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => onSelect(1)}
        >
          <Zap className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

type Props = {
  amount: Money;
  account: Account & { type: 'cashu' };
};

export default function ReceiveCashu({ amount, account }: Props) {
  const { current, scrollToIndex, setApi } = useCarousel();

  return (
    <>
      <PageHeader>
        <PageBackButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive Ecash</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center overflow-x-hidden overflow-y-hidden">
        <MoneyWithConvertedAmount money={amount} />
        <div className="flex w-full flex-col items-center justify-center px-8 py-8">
          <Carousel setApi={setApi} opts={{ align: 'center', loop: true }}>
            <CarouselContent>
              <CashuRequestQRItem account={account} amount={amount} />
              <MintQuoteItem
                account={account}
                amount={amount}
                isVisible={current === 1}
              />
            </CarouselContent>
          </Carousel>
          <CarouselControls current={current} onSelect={scrollToIndex} />
        </div>
      </PageContent>
    </>
  );
}
