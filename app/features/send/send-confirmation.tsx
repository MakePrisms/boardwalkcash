import {
  type PaymentRequest as CashuPaymentRequest,
  type Proof,
  decodePaymentRequest,
} from '@cashu/cashu-ts';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
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
import { getDefaultUnit } from '../shared/currencies';
import { getErrorMessage } from '../shared/error';
import {
  useCashuSendQuote,
  useCreateCashuSendQuote,
  useInitiateCashuSendQuote,
} from './cashu-send-quote-hooks';
import { useSendStore } from './send-provider';
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
}: { label: string; value: string | React.ReactNode }) => {
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
  disabled,
  isConfirming,
  error,
}: {
  amount: Money;
  children: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  isConfirming?: boolean;
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
          <Button
            onClick={onConfirm}
            loading={isConfirming}
            disabled={disabled || !!error}
          >
            Confirm
          </Button>
        </div>
      </PageContent>
    </Page>
  );
};

type PayBolt11ConfirmationProps = {
  /** The bolt11 invoice to pay */
  bolt11: string;
  /** The amount the user inputted or the amount matching their send account*/
  inputAmount: Money;
  /** The account to send from */
  account: CashuAccount;
  /** The destination to display in the UI. For sends to bolt11 this will be the same as the bolt11, for ln addresses it will be the ln address. */
  displayDestination: string;
};

/**
 * This component first creates a melt quote to estimate the fee.
 * Once the user confirms the payment details, then we need to get proofs
 * that match the total amount to pay the invoice. This is the fee + the invoice amount.
 *
 * Then, once proofs are create we give them to the mint to melt.
 */
export const PayBolt11Confirmation = ({
  bolt11,
  inputAmount,
  account,
  displayDestination,
}: PayBolt11ConfirmationProps) => {
  const { description } = decodeBolt11(bolt11);
  const { toast } = useToast();

  const { mutate: createSendQuote, data, error } = useCreateCashuSendQuote();
  const fee = data?.feeReserve;

  const {
    mutate: initiateSend,
    status: initiateSendStatus,
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

  const { quote } = useCashuSendQuote({
    sendQuoteId: sendQuoteId,
    onExpired: () => {
      toast({
        title: 'Send quote expired',
        description: 'Please try again',
      });
    },
  });

  useEffect(() => {
    createSendQuote({ account, amount: inputAmount, paymentRequest: bolt11 });
  }, [createSendQuote, bolt11, inputAmount, account]);

  const handleConfirm = async () => {
    if (data) {
      initiateSend({ account, sendQuote: data });
    }
  };

  const confirmationRowData = useMemo(
    () => [
      {
        label: 'Estimated fee',
        value: fee ? (
          <MoneyDisplay
            variant="secondary"
            money={fee}
            unit={getDefaultUnit(fee.currency)}
          />
        ) : (
          <Skeleton className="h-[33px] w-[20px]" />
        ),
      },
      { label: 'From', value: account.name },
      { label: 'Paying', value: formatDestination(displayDestination) },
    ],
    [fee, account, displayDestination],
  );

  if (quote?.state === 'PAID') {
    return (
      <SuccessfulSendPage
        amount={quote.amountToSend}
        account={account}
        destination={formatDestination(bolt11)}
        feesPaid={quote.amountSpent.subtract(quote.amountToSend)}
      />
    );
  }

  return (
    <BaseConfirmation
      amount={data?.totalAmountToSend ?? inputAmount}
      onConfirm={handleConfirm}
      isConfirming={
        initiateSendStatus === 'pending' ||
        quote?.state === 'UNPAID' ||
        quote?.state === 'PENDING'
      }
      disabled={!data}
      error={error ? getErrorMessage(error) : undefined}
    >
      {confirmationRowData.map((row) => (
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
  /** The amount to send. Currency should match the account's currency */
  amount: Money;
  /** The account to send from */
  account: CashuAccount;
};

/**
 * This component is used to create a cashu token.
 * From a cashu account, we can create a token by swapping proofs we have
 * for the amount we want to send, then encoding as a token.
 *
 * This component should first estimate the fee for the swap, then once the user confirms
 * the payment details, it creates the token and navigates to the share page.
 *
 * NOTE: I think there's an open question of whether we should have a confirmation
 * for creating tokens or if it should be one click
 */
export const CreateCashuTokenConfirmation = ({
  amount,
  account,
}: CreateCashuTokenConfirmationProps) => {
  // here we are sending a token, so we may need to swap to create the token
  // swapping will incur fees
  const fee = Money.zero(amount.currency);
  const setCashuToken = useSendStore((state) => state.setCashuToken);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setCashuToken({
      mint: account.mintUrl,
      proofs: [], // TODO
      unit: getDefaultUnit(amount.currency),
      memo: '',
    });
    navigate('/send/share');
  };

  const confirmationRowData = useMemo(
    () => [
      {
        label: 'Estimated fee',
        value: fee ? (
          <MoneyDisplay
            variant="secondary"
            money={fee}
            unit={getDefaultUnit(fee.currency)}
          />
        ) : (
          <Skeleton className="h-[33px] w-[20px]" />
        ),
      },
      { label: 'From', value: account.name },
      { label: 'Sending', value: 'eCash Token' },
    ],
    [fee, account],
  );

  return (
    <BaseConfirmation amount={amount} onConfirm={handleConfirm}>
      {confirmationRowData.map((row) => (
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

  const confirmationRowData = useMemo(
    () => [
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
    ],
    [data, account, sendToMintUrl, paymentRequest],
  );

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
