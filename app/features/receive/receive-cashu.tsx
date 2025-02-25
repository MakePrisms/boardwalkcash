import { AlertCircle, Banknote, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import { MoneyDisplay } from '~/components/money-display';
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
import { getDefaultUnit } from '~/features/shared/currencies';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { cn } from '~/lib/utils';
import type { Account } from '../accounts/account';
import { getCashuRequest } from './reusable-payment-request';
import { useMintQuote } from './use-mint-quote';
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
  account: Account & { type: 'cashu' };
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
  account: Account & { type: 'cashu' };
  amount: Money;
  isVisible: boolean;
};

function MintQuoteItem({ account, amount, isVisible }: MintQuoteProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { mintQuote, createQuote, fetchError, checkError, isLoading } =
    useMintQuote({
      account,
      amount,
    });
  const { toast } = useToast();

  useEffect(() => {
    if (checkError) {
      toast({
        title: 'Error',
        description: checkError,
        variant: 'destructive',
      });
    }
  }, [checkError, toast]);

  useEffect(() => {
    if (isVisible && !mintQuote) {
      createQuote();
    }
  }, [isVisible, createQuote, mintQuote]);

  return (
    <QRCarouselItem
      value={mintQuote?.request}
      description="Scan with any Lightning wallet."
      error={fetchError || checkError}
      isLoading={isLoading}
      onClick={
        mintQuote?.request
          ? () => {
              copyToClipboard(mintQuote?.request);
              toast({
                title: 'Copied BOLT11 Lightning Invoice',
                description: `${mintQuote?.request?.slice(0, 5)}...${mintQuote?.request?.slice(-5)}`,
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
  const { data: rate, error: exchangeRateError } = useExchangeRate(
    `${amount.currency}-${amount.currency === 'BTC' ? 'USD' : 'BTC'}`,
  );

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
        <div className="flex min-h-[116px] flex-col items-center">
          <MoneyDisplay money={amount} unit={getDefaultUnit(amount.currency)} />
          {!exchangeRateError && rate && (
            <MoneyDisplay
              money={amount.convert(
                amount.currency === 'BTC' ? 'USD' : 'BTC',
                rate,
              )}
              unit={getDefaultUnit(amount.currency === 'BTC' ? 'USD' : 'BTC')}
              variant="secondary"
            />
          )}
        </div>

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
