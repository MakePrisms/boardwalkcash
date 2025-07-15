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
import { LinkWithViewTransition } from '~/lib/transitions';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  useCashuReceiveQuote,
  useCreateCashuReceiveQuote,
} from './cashu-receive-quote-hooks';
import { SuccessfulReceivePage } from './successful-receive-page';

type MintQuoteProps = {
  account: CashuAccount;
  amount: Money;
  onPaid: () => void;
  onCopied: () => void;
};

function MintQuoteCarouselItem({
  account,
  amount,
  onPaid,
  onCopied,
}: MintQuoteProps) {
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

  useEffectNoStrictMode(() => {
    if (!quote) {
      createQuote({ account, amount });
    }
  }, [quote, createQuote, amount, account]);

  return (
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
                duration: 1000,
              });
              onCopied();
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

type Status = 'received' | 'pending';

export default function ReceiveCashu({ amount, account }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const [showOk, setShowOk] = useState(false);
  if (status === 'received') {
    return <SuccessfulReceivePage amount={amount} account={account} />;
  }

  return (
    <>
      <PageHeader>
        <ClosePageButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive Ecash</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center overflow-x-hidden overflow-y-hidden">
        <MoneyWithConvertedAmount money={amount} />
        <MintQuoteCarouselItem
          account={account}
          amount={amount}
          onPaid={() => setStatus('received')}
          onCopied={() => setShowOk(true)}
        />
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
