import { Banknote, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Carousel, CarouselContent } from '~/components/ui/carousel';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  CarouselControls,
  QRCarouselItem,
  useCarousel,
} from '../shared/qr-code';
import { getCashuRequest } from './reusable-payment-request';
import { useMintQuote } from './use-mint-quote';

type CashuRequestQRItemProps = {
  account: Account & { type: 'cashu' };
  amount: Money;
};

function CashuRequestQRItem({ account, amount }: CashuRequestQRItemProps) {
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

type Props = {
  amount: Money;
  account: Account & { type: 'cashu' };
};

export default function ReceiveCashu({ amount, account }: Props) {
  const { current, scrollToIndex, setApi } = useCarousel();

  const carouselOptions = [
    {
      icon: <Banknote className="h-5 w-5" />,
      id: 'cashu',
      label: 'Cashu Payment Request',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      id: 'lightning',
      label: 'Lightning Invoice',
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
          <CarouselControls
            current={current}
            onSelect={scrollToIndex}
            options={carouselOptions}
          />
        </div>
      </PageContent>
    </>
  );
}
