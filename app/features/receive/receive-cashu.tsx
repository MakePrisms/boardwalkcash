import { useRef, useState } from 'react';
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
import { useCashuAuthStore } from '../shared/cashu-auth';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  useCashuReceiveQuote,
  useCreateCashuReceiveQuote,
} from './cashu-receive-quote-hooks';

type MintQuoteProps = {
  account: CashuAccount;
  amount: Money;
  onPaid: (quote: CashuReceiveQuote) => void;
  onCopy?: (paymentRequest: string) => void;
};

function MintQuoteCarouselItem({
  account,
  amount,
  onPaid,
  onCopy,
}: MintQuoteProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const { setPendingAuthRequest } = useCashuAuthStore();
  // TODO: we shoudn't need this, but I added it because without when you go back to /receive it will re-run the auth check
  const hasRunAuthCheck = useRef(false);
  const checkAuthRequired = useCashuAuthStore((x) => x.checkAuthRequired);
  const checkAuthRequiredForPaths = useCashuAuthStore(
    (x) => x.checkAuthRequiredForPaths,
  );

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
  // Check auth requirements and create quote (only once on mount)
  useEffectNoStrictMode(() => {
    if (hasRunAuthCheck.current || quote) return;

    hasRunAuthCheck.current = true;

    //  TODO: these auth checks are cumbersome and repeated in receive-cashu-token-hooks.tsx and wallet.tsx
    const checkAuthAndCreateQuote = async () => {
      try {
        const authCheck = await checkAuthRequired(account.mintUrl);
        const authRequired =
          authCheck.requiresClearAuth || authCheck.requiresBlindAuth;

        console.debug('authRequired', authRequired);

        if (authRequired) {
          const pathAuthCheck = await checkAuthRequiredForPaths(
            account.mintUrl,
            ['/v1/mint/quote/bolt11', '/v1/mint/bolt11'],
          );

          console.debug('pathAuthCheck', pathAuthCheck);

          // We don't let the user generate an invoice if auth is required to do any of these things.
          // Once the user authenticates we allow them to generate an invoice.
          const anyAuthRequired =
            pathAuthCheck.requiresClearAuth || pathAuthCheck.requiresBlindAuth;

          if (anyAuthRequired) {
            setAuthError('Authentication required for this mint'); // This shows on the QR code
            setPendingAuthRequest({
              // This triggers the auth modal to pop up
              mintUrl: account.mintUrl,
              message:
                'Authentication is required to receive Lightning payments.',
            });
            return;
          }
        }

        setAuthError(null);
        // only create quote if auth is not required
        createQuote({ account, amount });
      } catch (error) {
        console.error('Failed to check auth requirements', error);
        setAuthError('Failed to check mint authentication requirements');
      }
    };

    checkAuthAndCreateQuote();
  }, [
    quote,
    createQuote,
    amount,
    account,
    account.mintUrl,
    setPendingAuthRequest,
    checkAuthRequired,
    checkAuthRequiredForPaths,
  ]);

  return (
    <QRCode
      value={quote?.paymentRequest}
      description="Scan with any Lightning wallet."
      error={
        authError ||
        (isExpired
          ? 'This invoice has expired. Please create a new one.'
          : error?.message)
      }
      isLoading={['pending', 'idle'].includes(createQuoteStatus)}
      onClick={
        quote?.paymentRequest && onCopy
          ? () => onCopy(quote.paymentRequest)
          : undefined
      }
    />
  );
}

type Props = {
  amount: Money;
  account: CashuAccount;
};

export default function ReceiveCashu({ amount, account }: Props) {
  const [showOk, setShowOk] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();

  const handleCopy = (paymentRequest: string) => {
    copyToClipboard(paymentRequest);
    toast({
      title: 'Copied Lightning invoice',
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
        <PageHeaderTitle>Receive Ecash</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center overflow-x-hidden overflow-y-hidden">
        <MoneyWithConvertedAmount money={amount} />
        <MintQuoteCarouselItem
          account={account}
          amount={amount}
          onPaid={(quote) => {
            navigate(`/transactions/${quote.transactionId}?redirectTo=/`, {
              transition: 'fade',
              applyTo: 'newView',
            });
          }}
          onCopy={handleCopy}
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
