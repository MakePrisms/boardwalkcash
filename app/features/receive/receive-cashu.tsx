import { Banknote, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  CarouselControls,
  CarouselWithControls,
  type Control,
  useCarousel,
} from '~/components/carousel-with-controls';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRCode } from '~/components/qr-code';
import type { CashuAccount } from '~/features/accounts/account';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  useCashuReceiveQuote,
  useCreateCashuReceiveQuote,
} from './cashu-receive-quote-hooks';
import { getCashuRequest } from './reusable-payment-request';
import { SuccessfulReceivePage } from './successful-receive-page';

type CashuRequestItemProps = {
  account: CashuAccount;
  amount: Money;
};

function CashuRequestItem({ account, amount }: CashuRequestItemProps) {
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
    <QRCode
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
  onPaid: () => void;
};

function MintQuoteItem({ account, amount, isVisible, onPaid }: MintQuoteProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const {
    mutate: createQuote,
    data: createdQuote,
    isPending,
    error,
  } = useCreateCashuReceiveQuote();

  const { quote, status } = useCashuReceiveQuote({
    quoteId: createdQuote?.id,
    onPaid: onPaid,
  });

  useEffect(() => {
    if (isVisible && !quote) {
      createQuote({ account, amount });
    }
  }, [isVisible, createQuote, quote, account, amount]);

  const isExpired = status === 'EXPIRED';

  return (
    <QRCode
      value={!isExpired ? quote?.paymentRequest : undefined}
      description="Scan with any Lightning wallet."
      error={
        isExpired
          ? 'This invoice has expired. Please create a new one.'
          : error?.message
      }
      isLoading={isPending}
      onClick={
        quote?.paymentRequest
          ? () => {
              copyToClipboard(quote.paymentRequest);
              toast({
                title: 'Copied Lightning invoice',
                description: `${quote.paymentRequest.slice(0, 5)}...${quote.paymentRequest.slice(-5)}`,
              });
            }
          : undefined
      }
    />
  );
}

const carouselControls: Control[] = [
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

type Props = {
  amount: Money;
  account: CashuAccount;
};

export default function ReceiveCashu({ amount, account }: Props) {
  const { current, setApi } = useCarousel();
  const [isPaid, setIsPaid] = useState(false);

  if (isPaid) {
    return <SuccessfulReceivePage amount={amount} account={account} />;
  }

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

        <CarouselWithControls setApi={setApi}>
          <CarouselWithControls.Content>
            <CarouselWithControls.Item>
              <CashuRequestItem account={account} amount={amount} />
            </CarouselWithControls.Item>

            <CarouselWithControls.Item>
              <MintQuoteItem
                account={account}
                amount={amount}
                isVisible={current === 1}
                onPaid={() => setIsPaid(true)}
              />
            </CarouselWithControls.Item>
          </CarouselWithControls.Content>
          <CarouselControls>
            {carouselControls.map((control) => (
              <CarouselControls.Control key={control.id} {...control} />
            ))}
          </CarouselControls>
        </CarouselWithControls>
      </PageContent>
    </>
  );
}
