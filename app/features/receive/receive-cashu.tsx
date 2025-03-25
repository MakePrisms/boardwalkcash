import { Banknote, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useCopyToClipboard, useTimeout } from 'usehooks-ts';
import {
  CarouselWithNavigationControls,
  useCarousel,
} from '~/components/carousel-with-navigation-controls';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRCodeDisplay } from '~/components/qr-code-display';
import type { CashuAccount } from '~/features/accounts/account';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  useCashuReceiveQuote,
  useCreateCashuReceiveQuote,
} from './cashu-receive-quote';
import { getCashuRequest } from './reusable-payment-request';

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
    <QRCodeDisplay
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
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();

  const {
    mutate: createQuote,
    data: createdQuote,
    isPending,
    error,
  } = useCreateCashuReceiveQuote();

  const { quote, status } = useCashuReceiveQuote({
    quoteId: createdQuote?.id,
  });

  useEffect(() => {
    if (isVisible && !quote) {
      createQuote({ account, amount });
    }
  }, [isVisible, createQuote, quote, account, amount]);

  const isPaid = status === 'paid' || status === 'completed';

  useTimeout(
    () => {
      navigate('/', {
        transition: 'slideDown',
        applyTo: 'oldView',
      });
    },
    isPaid ? 3500 : null,
  );

  return (
    <QRCodeDisplay
      value={quote?.paymentRequest}
      description="Scan with any Lightning wallet."
      error={
        status === 'expired'
          ? 'This quote has expired. Please create a new one.'
          : error?.message
      }
      isLoading={isPending}
      isSuccess={isPaid}
      successMessage="Payment received!"
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

type Props = {
  amount: Money;
  account: CashuAccount;
};

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

export default function ReceiveCashu({ amount, account }: Props) {
  const { current, setApi } = useCarousel();

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
        <CarouselWithNavigationControls
          controls={carouselOptions}
          setApi={setApi}
        >
          <CashuRequestItem account={account} amount={amount} />
          <MintQuoteItem
            account={account}
            amount={amount}
            isVisible={current === 1}
          />
        </CarouselWithNavigationControls>
      </PageContent>
    </>
  );
}
