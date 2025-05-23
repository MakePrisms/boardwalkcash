import { Banknote, Zap } from 'lucide-react';
import { useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRCode } from '~/components/qr-code';
import {
  Carousel,
  CarouselContent,
  CarouselControls,
  CarouselItem,
} from '~/components/ui/carousel';
import type { CashuAccount } from '~/features/accounts/account';
import { useToast } from '~/hooks/use-toast';
import { getCashuProtocolUnit } from '~/lib/cashu';
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

function CashuRequestCarouselItem({ account, amount }: CashuRequestItemProps) {
  const cashuUnit = getCashuProtocolUnit(account.currency);
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  // TODO: this should come from some hook that does a similar thing to the mint quote hook
  const cashuRequest = getCashuRequest(account, {
    amount,
    unit: cashuUnit,
    singleUse: true,
  }).toEncodedRequest();

  return (
    <CarouselItem>
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
    </CarouselItem>
  );
}

type MintQuoteProps = {
  account: CashuAccount;
  amount: Money;
  onPaid: () => void;
};

function MintQuoteCarouselItem({ account, amount, onPaid }: MintQuoteProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const {
    mutate: createQuote,
    data: createdQuote,
    status: createQuoteStatus,
    error,
  } = useCreateCashuReceiveQuote();

  const { quote, status: quotePaymentStatus } = useCashuReceiveQuote({
    quoteId: createdQuote?.id,
    onPaid: onPaid,
  });

  const isExpired = quotePaymentStatus === 'EXPIRED';

  const handlePresented = () => {
    if (!quote) {
      createQuote({ account, amount });
    }
  };

  return (
    <CarouselItem onPresented={handlePresented}>
      <QRCode
        value={quote?.paymentRequest}
        description="Scan with any Lightning wallet."
        error={
          isExpired
            ? 'This invoice has expired. Please create a new one.'
            : error?.message
        }
        isLoading={['pending', 'idle'].includes(createQuoteStatus)}
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
    </CarouselItem>
  );
}

type Props = {
  amount: Money;
  account: CashuAccount;
};

type Status = 'received' | 'pending';

export default function ReceiveCashu({ amount, account }: Props) {
  const [status, setStatus] = useState<Status>('pending');

  if (status === 'received') {
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

        <Carousel opts={{ align: 'center', loop: true }}>
          <CarouselContent>
            <CashuRequestCarouselItem account={account} amount={amount} />
            <MintQuoteCarouselItem
              account={account}
              amount={amount}
              onPaid={() => setStatus('received')}
            />
          </CarouselContent>
          <CarouselControls>
            <Banknote className="h-5 w-5" />
            <Zap className="h-5 w-5" />
          </CarouselControls>
        </Carousel>
      </PageContent>
    </>
  );
}
