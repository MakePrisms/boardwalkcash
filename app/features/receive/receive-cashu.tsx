import { useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  ClosePageButton,
  PageContent,
  PageFooter,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRCode } from '~/components/qr-code';
import { Button } from '~/components/ui/button';
import type { CashuAccount } from '~/features/accounts/account';
import { useEffectNoStrictMode } from '~/hooks/use-effect-no-strict-mode';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import {
  LinkWithViewTransition,
  useNavigateWithViewTransition,
} from '~/lib/transitions';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  useCashuReceiveQuote,
  useCreateCashuReceiveQuote,
} from './cashu-receive-quote-hooks';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '~/components/ui/carousel';
import { useCreateOnchainReceiveQuote } from './reusable-cashu-receive-quote-hooks';

type MintQuoteProps = {
  account: CashuAccount;
  amount?: Money;
  onPaid: (quote: CashuReceiveQuote) => void;
  onCopy?: (paymentRequest: string) => void;
};

function OnchainQuoteCarouselItem({
  account,
  onCopy,
}: {
  account: CashuAccount;
  onCopy?: (paymentRequest: string) => void;
}) {
  const {
    mutate: createQuote,
    data: quote,
    status: createQuoteStatus,
    error,
  } = useCreateOnchainReceiveQuote();

  return (
    <CarouselItem
      onPresented={() => {
        createQuote({ account });
      }}
    >
      <QRCode
        value={quote?.request}
        description="Click to copy. Send an onchain payment to this address."
        error={error?.message}
        isLoading={['pending', 'idle'].includes(createQuoteStatus)}
        onClick={
          quote?.request && onCopy ? () => onCopy(quote.request) : undefined
        }
      />
    </CarouselItem>
  );
}

function MintQuoteCarouselItem({
  account,
  amount,
  onPaid,
  onCopy,
}: MintQuoteProps & {
  amount: Money;
}) {
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

  useEffectNoStrictMode(() => {
    if (!quote) {
      createQuote({ account, amount, type: 'LIGHTNING' });
    }
  }, [quote, createQuote, amount, account]);

  return (
    <CarouselItem>
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
          quote?.paymentRequest && onCopy
            ? () => onCopy(quote.paymentRequest)
            : undefined
        }
      />
    </CarouselItem>
  );
}

type Props = {
  amount: Money | null;
  account: CashuAccount;
  onchainOnly?: boolean;
};

export default function ReceiveCashu({
  amount,
  account,
  onchainOnly = false,
}: Props) {
  const [showOk, setShowOk] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();

  const handleCopy = (paymentRequest: string) => {
    copyToClipboard(paymentRequest);
    toast({
      title: onchainOnly
        ? 'Copied Bitcoin address'
        : 'Copied Lightning invoice',
      description: `${paymentRequest.slice(0, 5)}...${paymentRequest.slice(-5)}`,
      duration: 1000,
    });
    setShowOk(true);
  };

  return (
    <>
      <PageHeader>
        <ClosePageButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>
          {onchainOnly ? 'Receive Bitcoin' : 'Receive Ecash'}
        </PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center overflow-x-hidden overflow-y-hidden">
        {amount && !onchainOnly ? (
          <MoneyWithConvertedAmount money={amount} />
        ) : (
          <div className="h-[116px] w-full" />
        )}
        <Carousel opts={{ align: 'center', loop: true }}>
          <CarouselContent>
            {amount && (
              <MintQuoteCarouselItem
                account={account}
                amount={amount}
                onPaid={(quote) => {
                  navigate(
                    `/transactions/${quote.transactionId}?redirectTo=/`,
                    {
                      transition: 'fade',
                      applyTo: 'newView',
                    },
                  );
                }}
                onCopy={handleCopy}
              />
            )}
            <OnchainQuoteCarouselItem
              account={account}
              // onPaid={}
              onCopy={handleCopy}
            />
          </CarouselContent>
        </Carousel>
      </PageContent>
      {showOk && (
        <PageFooter className="pb-14">
          <Button asChild className="w-[80px]">
            <LinkWithViewTransition
              to="/"
              transition="slideDown"
              applyTo="oldView"
            >
              OK
            </LinkWithViewTransition>
          </Button>
        </PageFooter>
      )}
    </>
  );
}
