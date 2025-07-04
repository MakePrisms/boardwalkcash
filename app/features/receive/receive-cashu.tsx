import { useRef, useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRCode } from '~/components/qr-code';
import type { CashuAccount } from '~/features/accounts/account';
import { useEffectNoStrictMode } from '~/hooks/use-effect-no-strict-mode';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { cashuAuthService, useCashuAuthStore } from '../shared/cashu-auth';
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
};

function MintQuoteCarouselItem({ account, amount, onPaid }: MintQuoteProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  const { setPendingAuthRequest } = useCashuAuthStore();
  // TODO: we shoudn't need this
  const hasRunAuthCheck = useRef(false);

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

    console.debug('checkAuthAndCreateQuote - running once on mount');
    hasRunAuthCheck.current = true;

    const checkAuthAndCreateQuote = async () => {
      try {
        const authCheck = await cashuAuthService.checkAuthRequired(
          account.mintUrl,
        );
        const authRequired =
          authCheck.requiresClearAuth || authCheck.requiresBlindAuth;

        console.debug('authRequired', authRequired);

        if (authRequired) {
          const [
            mintQuoteAuthCheck,
            mintBolt11AuthCheck,
            getMintQuoteAuthCheck,
          ] = await Promise.all([
            cashuAuthService.checkAuthRequiredForPaths(account.mintUrl, [
              '/v1/mint/quote/bolt11',
            ]),
            cashuAuthService.checkAuthRequiredForPaths(account.mintUrl, [
              '/v1/mint/bolt11',
            ]),
            cashuAuthService.checkAuthRequiredForPaths(account.mintUrl, [
              '/v1/mint/quote/bolt11',
            ]),
          ]);

          console.debug('mintQuoteAuthCheck', mintQuoteAuthCheck);
          console.debug('mintBolt11AuthCheck', mintBolt11AuthCheck);
          console.debug('getMintQuoteAuthCheck', getMintQuoteAuthCheck);

          const anyAuthRequired =
            mintQuoteAuthCheck.requiresClearAuth ||
            mintQuoteAuthCheck.requiresBlindAuth ||
            mintBolt11AuthCheck.requiresClearAuth ||
            mintBolt11AuthCheck.requiresBlindAuth ||
            getMintQuoteAuthCheck.requiresClearAuth ||
            getMintQuoteAuthCheck.requiresBlindAuth;

          if (anyAuthRequired) {
            setAuthError('Authentication required for this mint');
            setPendingAuthRequest({
              mintUrl: account.mintUrl,
              message:
                'Authentication is required to receive Lightning payments.',
            });
            return;
          }
        }

        setAuthError(null);
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
        quote?.paymentRequest
          ? () => {
              copyToClipboard(quote.paymentRequest);
              toast({
                title: 'Copied Lightning invoice',
                description: `${quote.paymentRequest.slice(0, 5)}...${quote.paymentRequest.slice(-5)}`,
                duration: 1000,
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
        <MintQuoteCarouselItem
          account={account}
          amount={amount}
          onPaid={() => setStatus('received')}
        />
      </PageContent>
    </>
  );
}
