import { AlertCircle, Banknote, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
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
import type { Account } from '../accounts/account-selector';
import { getCashuRequest } from './reusable-payment-request';
import { useMintQuote } from './use-mint-quote';

type QRCodeValue = {
  value?: string;
  description: string;
  error?: string;
  isLoading?: boolean;
};

/**
 * A component to display a QR code with a loading state or an error message.
 *
 * @param value - The value to display in the QR code.
 * @param error - The error message to display.
 * @param isLoading - Whether the QR code value is loading.
 */
function QRDisplay({
  value,
  error,
  isLoading,
}: { value?: string; error?: string; isLoading?: boolean }) {
  const baseClasses =
    'flex h-[256px] w-[256px] items-center justify-center rounded-lg';

  if (isLoading) {
    return <Skeleton className={baseClasses} />;
  }

  if (value) {
    return (
      <div className={cn(baseClasses, 'bg-foreground')}>
        <QRCodeSVG
          value={value}
          size={256}
          marginSize={3}
          className="rounded-lg bg-foreground"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(baseClasses, 'border bg-card')}>
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <AlertCircle className="h-8 w-8 text-foreground" />
          <p className="text-center text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }
}

function QRCarouselItem({
  value,
  description,
}: { value: QRCodeValue; description: string }) {
  return (
    <CarouselItem>
      <div className="flex flex-col items-center justify-center gap-8">
        <QRDisplay
          value={value.value}
          error={value.error}
          isLoading={value.isLoading}
        />
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

/**  A carousel to display a list of QR codes. */
function QRCarousel({
  values,
  onApiChange,
}: {
  values: QRCodeValue[];
  onApiChange: (api: CarouselApi) => void;
}) {
  return (
    <Carousel setApi={onApiChange} opts={{ align: 'center', loop: true }}>
      <CarouselContent>
        {values.map((value) => (
          <QRCarouselItem
            key={value.description}
            value={value}
            description={value.description}
          />
        ))}
      </CarouselContent>
    </Carousel>
  );
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
  const { toast } = useToast();
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const { current, scrollToIndex, setApi } = useCarousel();
  const { data: rate, error: exchangeRateError } = useExchangeRate(
    `${amount.currency}-${amount.currency === 'BTC' ? 'USD' : 'BTC'}`,
  );

  const { mintQuote, startFetching, fetchError, checkError, isLoading } =
    useMintQuote({
      account,
      amount,
    });

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
    if (current === 1) {
      // only start fetching after the user goes to the bolt11 carousel item
      // this is to prevent spamming the mint with unneeded requests
      startFetching();
    }
  }, [startFetching, current]);

  const cashuRequest = getCashuRequest(account, {
    amount,
    unit: cashuUnit,
    singleUse: true,
  }).toEncodedRequest();

  const qrCodeValues: QRCodeValue[] = [
    {
      value: cashuRequest,
      description: 'Scan with any wallet that supports Cashu payment requests.',
    },
    {
      value: mintQuote?.request,
      description: 'Scan with any Lighting wallet.',
      error: fetchError || checkError,
      isLoading: isLoading,
    },
  ];

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
          {!exchangeRateError && rate ? (
            <MoneyDisplay
              money={amount.convert(
                amount.currency === 'BTC' ? 'USD' : 'BTC',
                rate,
              )}
              unit={getDefaultUnit(amount.currency === 'BTC' ? 'USD' : 'BTC')}
              variant="secondary"
            />
          ) : (
            <Skeleton className="h-6 w-24" />
          )}
        </div>

        <div className="flex w-full flex-col items-center justify-center px-8 py-8">
          <QRCarousel values={qrCodeValues} onApiChange={setApi} />
          <CarouselControls current={current} onSelect={scrollToIndex} />
        </div>
      </PageContent>
    </>
  );
}
