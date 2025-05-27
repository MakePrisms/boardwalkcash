import {
  type PaymentRequest as CashuPaymentRequest,
  type Proof,
  decodePaymentRequest,
} from '@cashu/cashu-ts';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { MoneyDisplay } from '~/components/money-display';
import { PageHeaderTitle } from '~/components/page';
import { PageBackButton } from '~/components/page';
import { PageHeader } from '~/components/page';
import { Page } from '~/components/page';
import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { CashuAccount } from '~/features/accounts/account';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import { useToast } from '~/hooks/use-toast';
import { decodeBolt11 } from '~/lib/bolt11';
import { Money } from '~/lib/money';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import { getDefaultUnit } from '../shared/currencies';
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
        <div className="z-10 mt-auto mb-28">
          <Button onClick={onConfirm} loading={loading} disabled={!!error}>
            Confirm
          </Button>
        </div>
      </PageContent>
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
  } = useInitiateCashuSendQuote({
    onError: (error) => {
      console.error('Error initiating send quote', { cause: error });
      toast({
        title: 'Error',
        description: 'Failed to initiate send quote. Please try again.',
      });
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
        amount={quote.amountToSend}
        account={account}
        destination={formatDestination(destination)}
        feesPaid={quote.amountSpent.subtract(quote.amountToSend)}
      />
    );
  }

  if (quote?.state === 'FAILED') {
    // TODO: implement proper ui
    return <div>Send Failed</div>;
  }

  const handleConfirm = () => initiateSend({ account, sendQuote: bolt11Quote });

  const paymentInProgress = ['LOADING', 'UNPAID', 'PENDING'].includes(
    quoteStatus,
  );
  const { description } = decodeBolt11(destination);
  const fee = bolt11Quote.feeReserve;

  return (
    <BaseConfirmation
      amount={bolt11Quote.totalAmountToSend}
      onConfirm={handleConfirm}
      loading={paymentInProgress}
    >
      {[
        {
          label: 'Estimated fee',
          value: (
            <MoneyDisplay
              variant="secondary"
              money={fee}
              unit={getDefaultUnit(fee.currency)}
            />
          ),
        },
        { label: 'From', value: account.name },
        { label: 'Paying', value: formatDestination(destinationDisplay) },
      ].map((row) => (
        <ConfirmationRow key={row.label} label={row.label} value={row.value} />
      ))}
      {description && (
        <p className="text-center text-muted-foreground text-sm">
          {description}
        </p>
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

  const { data: createSwapData, mutate: createCashuSendSwap } =
    useCreateCashuSendSwap({
      onError: (error) => {
        console.error('Error creating cashu send swap', { cause: error });
        toast({
          title: 'Error',
          description: 'Failed to create cashu send swap. Please try again.',
        });
      },
    });

  console.log('createSwapData', createSwapData);

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

  const swapInProgress = ['LOADING', 'UNPAID', 'PENDING'].includes(status);

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

/**
 * Determine the mint to send to
 * Use mints from the payment request if available, otherwise use the account's mint
 * TODO: later account could be any type and might not have a mintUrl
 */
const getSendToMintUrl = (
  paymentRequest: CashuPaymentRequest,
  account: CashuAccount,
) => {
  const mintOptions = paymentRequest.mints?.length
    ? paymentRequest.mints
    : [account.mintUrl];
  if (mintOptions.includes(account.mintUrl)) {
    // Use selected account's mint if it's in the list or not specified in the request
    return account.mintUrl;
  }
  // payment request specified mints to send to, so we have to respect that

  // TODO: should we check if the user has another account that matches one of the requested mints?
  // Then we could send from that account instead of the one selected to avoid making a lightning payment
  // This would probably be a weird UX because the user already selected the account, we'd be making the decision for them
  return mintOptions[0];
};

/**
 * This component is used to pay a cashu request.
 *
 * If the request specifies mint(s), then we must sent to one of those mints.
 * We will try to send to the mint matching the send account, otherwise just pick one from the list.
 * If the selected mint does not match the send account, then we need to make a lightning payment
 * to the destination mint.
 *
 * This component should first estimate the fee for the swap, then once the user confirms
 * the payment details, it should get the needed proofs and pay the request.
 */
export const PayCashuRequestConfirmation = ({
  amount,
  paymentRequest,
  account,
}: {
  amount: Money;
  paymentRequest: string;
  account: CashuAccount;
}) => {
  const decoded = decodePaymentRequest(paymentRequest);
  decoded.description =
    decoded.description ?? 'This is a test to make sure the UI looks good';

  const sendToMintUrl = getSendToMintUrl(decoded, account);

  // always sending from account mint
  // TODO: later account could be anything. If not cashu, then lightning payment is always needed
  const needsCrossMintSwap = sendToMintUrl !== account.mintUrl;

  const { mutate, data } = useMutation({
    mutationFn: async () => {
      if (needsCrossMintSwap) {
        throw new Error('Not implemented');
      }

      return {
        quotes: undefined,
        fee: Money.zero(account.currency),
      };
    },
    onError: (error) => {
      console.error('Error getting quotes', error);
    },
    onSuccess: (data) => {
      console.log('quotes', data);
    },
  });

  useEffect(() => {
    mutate();
  }, [mutate]);

  const handleConfirm = async () => {
    let proofs: Proof[];
    if (needsCrossMintSwap) {
      if (!data?.quotes) {
        throw new Error('Trying to swap, but cross mint quotes are not loaded');
      }

      // TODO: swap the proofs to the mint in the payment request to get the proofs
      proofs = [];
    } else {
      // create proofs from same mint
      proofs = []; // TODO: create proofs from account for amount
    }

    // TODO: use the proofs to pay the request
    // 1. get transports from the payment request
    // 2. send proofs via nostr or POST
    console.log('proofs', proofs);
  };

  const confirmationRowData = [
    {
      label: 'Estimated fee',
      value: data?.fee ? (
        <MoneyDisplay
          variant="secondary"
          money={data.fee}
          unit={getDefaultUnit(data.fee.currency)}
        />
      ) : (
        <Skeleton className="h-[33px] w-[20px]" />
      ),
    },
    { label: 'From', value: account.name },
    {
      label: 'To',
      value: formatDestination(
        sendToMintUrl.replace('https://', '').replace('http://', ''),
      ),
    },
    { label: 'Paying', value: formatDestination(paymentRequest) },
  ];

  return (
    <BaseConfirmation amount={amount} onConfirm={handleConfirm}>
      {confirmationRowData.map((row) => (
        <ConfirmationRow key={row.label} label={row.label} value={row.value} />
      ))}

      {decoded.description && (
        <p className="text-center text-muted-foreground text-sm">
          {decoded.description}
        </p>
      )}
    </BaseConfirmation>
  );
};
