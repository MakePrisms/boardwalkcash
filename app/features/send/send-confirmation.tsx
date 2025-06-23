import { AlertCircle } from 'lucide-react';
import { MoneyDisplay } from '~/components/money-display';
import { PageFooter, PageHeaderTitle } from '~/components/page';
import { PageBackButton } from '~/components/page';
import { PageHeader } from '~/components/page';
import { Page } from '~/components/page';
import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import type { CashuAccount } from '~/features/accounts/account';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import { useToast } from '~/hooks/use-toast';
import { decodeBolt11 } from '~/lib/bolt11';
import type { Money } from '~/lib/money';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import { getDefaultUnit } from '../shared/currencies';
import { DomainError } from '../shared/error';
import {
  useCashuSendQuote,
  useInitiateCashuSendQuote,
} from './cashu-send-quote-hooks';
import type { CashuLightningQuote } from './cashu-send-quote-service';
import { useCreateCashuSendSwap } from './cashu-send-swap-hooks';
import { useTrackCashuSendSwap } from './cashu-send-swap-hooks';
import type { CashuSwapQuote } from './cashu-send-swap-service';
import { SuccessfulSendPage } from './succesful-send-page';

const formatDestination = (destination: string) => {
  if (destination && destination.length > 20) {
    return `${destination.slice(0, 5)}...${destination.slice(-5)}`;
  }
  return destination;
};

const ConfirmationRow = ({
  label,
  value,
}: { label: string; value: React.ReactNode }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground">{label}</p>
      <div>{value}</div>
    </div>
  );
};

/**
 * Base confirmation component that displays the amount, the confirmation rows, and a confirm button
 */
const BaseConfirmation = ({
  amount,
  onConfirm,
  children,
  loading,
  error,
}: {
  amount: Money;
  children: React.ReactNode;
  onConfirm: () => void;
  loading?: boolean;
  error?: string;
}) => {
  return (
    <Page>
      <PageHeader className="z-10">
        <PageBackButton to="/send" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Confirm Payment</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center gap-4">
        <MoneyWithConvertedAmount money={amount} />
        <div className="absolute top-0 right-0 bottom-0 left-0 mx-auto flex max-w-sm items-center justify-center">
          <Card className="m-4 w-full">
            <CardContent className="flex flex-col gap-6 pt-6">
              {error ? (
                <div className="flex flex-col items-center justify-center gap-2 p-4">
                  <AlertCircle className="h-8 w-8 text-foreground" />
                  <p className="text-center text-muted-foreground text-sm">
                    {error}
                  </p>
                </div>
              ) : (
                children
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
      <PageFooter className="pb-14">
        <Button onClick={onConfirm} loading={loading} disabled={!!error}>
          Confirm
        </Button>
      </PageFooter>
    </Page>
  );
};

type PayBolt11ConfirmationProps = {
  /** The bolt11 invoice to pay */
  destination: string;
  /** The account to send from */
  account: CashuAccount;
  /** The destination to display in the UI. For sends to bolt11 this will be the same as the bolt11, for ln addresses it will be the ln address. */
  destinationDisplay: string;
  /** The quote to display in the UI. */
  quote: CashuLightningQuote;
};

/**
 * This component first creates a melt quote to estimate the fee.
 * Once the user confirms the payment details, then we need to get proofs
 * that match the total amount to pay the invoice. This is the fee + the invoice amount.
 *
 * Then, once proofs are create we give them to the mint to melt.
 */
export const PayBolt11Confirmation = ({
  account,
  quote: bolt11Quote,
  destination,
  destinationDisplay,
}: PayBolt11ConfirmationProps) => {
  const { toast } = useToast();

  const {
    mutate: initiateSend,
    data: { id: sendQuoteId } = {},
    isPending: isCreatingSendQuote,
  } = useInitiateCashuSendQuote({
    onError: (error) => {
      if (error instanceof DomainError) {
        toast({ description: error.message });
      } else {
        console.error('Error initiating send quote', { cause: error });
        toast({
          title: 'Error',
          description: 'Failed to initiate send quote. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  const { quote, status: quoteStatus } = useCashuSendQuote({
    sendQuoteId,
    onExpired: () => {
      toast({
        title: 'Send quote expired',
        description: 'Please try again',
      });
    },
  });

  if (quote?.state === 'PAID') {
    return (
      <SuccessfulSendPage
        amountSpent={quote.amountSpent}
        account={account}
        destination={formatDestination(destination)}
        amountReceived={quote.amountToReceive}
        feesPaid={quote.amountSpent.subtract(quote.amountToReceive)}
      />
    );
  }

  if (quote?.state === 'FAILED') {
    // TODO: implement proper ui
    return <div>Send Failed: {quote.failureReason}</div>;
  }

  const handleConfirm = () =>
    initiateSend({ accountId: account.id, sendQuote: bolt11Quote });

  const paymentInProgress =
    ['LOADING', 'UNPAID', 'PENDING'].includes(quoteStatus) ||
    isCreatingSendQuote;
  const { description } = decodeBolt11(destination);

  return (
    <BaseConfirmation
      amount={bolt11Quote.estimatedTotalAmount}
      onConfirm={handleConfirm}
      loading={paymentInProgress}
    >
      {[
        {
          label: 'Recipient gets',
          value: (
            <MoneyDisplay
              variant="secondary"
              money={bolt11Quote.amountToReceive}
              unit={getDefaultUnit(bolt11Quote.amountToReceive.currency)}
            />
          ),
        },
        {
          label: 'Estimated fee',
          value: (
            <MoneyDisplay
              variant="secondary"
              money={bolt11Quote.estimatedTotalFee}
              unit={getDefaultUnit(bolt11Quote.estimatedTotalFee.currency)}
            />
          ),
        },
        { label: 'From', value: account.name },
        { label: 'Paying', value: formatDestination(destinationDisplay) },
      ].map((row) => (
        <ConfirmationRow key={row.label} label={row.label} value={row.value} />
      ))}
      {description && (
        <div className="flex items-center justify-between gap-12">
          <p className="text-muted-foreground">Memo</p>
          <p className=" truncate ">{description}</p>
        </div>
      )}
    </BaseConfirmation>
  );
};

type CreateCashuTokenConfirmationProps = {
  quote: CashuSwapQuote;
  account: CashuAccount;
};

/**
 * This component is used to create a cashu token.
 * From a cashu account, we can create a token by swapping proofs we have
 * for the amount we want to send, then encoding as a token.
 *
 * This component should first estimate the fee for the swap, then once the user confirms
 * the payment details, it creates the token and navigates to the share page.
 */
export const CreateCashuTokenConfirmation = ({
  quote,
  account,
}: CreateCashuTokenConfirmationProps) => {
  const navigate = useNavigateWithViewTransition();
  const { toast } = useToast();

  const {
    data: createSwapData,
    mutate: createCashuSendSwap,
    isPending: isCreatingSwap,
  } = useCreateCashuSendSwap({
    onError: (error) => {
      console.error('Error creating cashu send swap', { cause: error });
      toast({
        title: 'Error',
        description: 'Failed to create cashu send swap. Please try again.',
      });
    },
  });

  const { status } = useTrackCashuSendSwap({
    id: createSwapData?.id,
    onPending: (swap) => {
      console.log('swap pending', { swap });
      navigate(`/send/share/${swap.id}`, {
        transition: 'slideUp',
        applyTo: 'newView',
      });
    },
  });

  const swapInProgress =
    ['LOADING', 'DRAFT', 'PENDING'].includes(status) || isCreatingSwap;

  return (
    <BaseConfirmation
      amount={quote.totalAmount}
      onConfirm={() =>
        createCashuSendSwap({
          accountId: account.id,
          amount: quote.amountRequested,
        })
      }
      loading={swapInProgress}
    >
      {[
        {
          label: 'Recipient gets',
          value: (
            <MoneyDisplay
              variant="secondary"
              money={quote.amountRequested}
              unit={getDefaultUnit(quote.amountRequested.currency)}
            />
          ),
        },
        {
          label: 'Estimated fee',
          value: (
            <MoneyDisplay
              variant="secondary"
              money={quote.totalFee}
              unit={getDefaultUnit(quote.totalFee.currency)}
            />
          ),
        },
        { label: 'From', value: account.name },
        { label: 'Sending', value: 'ecash' },
      ].map((row) => (
        <ConfirmationRow key={row.label} label={row.label} value={row.value} />
      ))}
    </BaseConfirmation>
  );
};
