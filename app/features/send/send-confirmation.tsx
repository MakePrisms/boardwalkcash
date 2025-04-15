import {
  CashuMint,
  type PaymentRequest as CashuPaymentRequest,
  CashuWallet,
  type Proof,
  decodePaymentRequest,
} from '@cashu/cashu-ts';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MoneyDisplay } from '~/components/money-display';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { CashuAccount } from '~/features/accounts/account';
import type { PaymentRequest } from '~/features/send/send-store';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import { useToast } from '~/hooks/use-toast';
import { decodeBolt11 } from '~/lib/bolt11';
import { crossMintSwap, getCrossMintQuotes } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import { getDefaultUnit } from '../shared/currencies';
import {
  useCashuSendQuote,
  useCreateCashuSendQuote,
  useInitiateCashuSendQuote,
} from './cashu-send-quote-hooks';
import { useSendStore } from './send-provider';

const formatDestination = (destination: string) => {
  if (destination && destination.length > 20) {
    return `${destination.slice(0, 5)}...${destination.slice(-5)}`;
  }
  return destination;
};

const toMoney = (amount: number, currency: Currency): Money => {
  return new Money({
    amount,
    currency,
    unit: getDefaultUnit(currency),
  });
};

/**
 * Base confirmation component that displays the amount, the confirmation rows, and a confirm button
 */
const BaseConfirmation = ({
  amount,
  onConfirm,
  children,
}: { amount: Money; children: React.ReactNode; onConfirm: () => void }) => {
  return (
    <>
      <MoneyWithConvertedAmount money={amount} />
      <div className="absolute top-0 right-0 bottom-0 left-0 mx-auto flex max-w-sm items-center justify-center">
        <Card className="m-4 w-full">
          <CardContent className="flex flex-col gap-6">{children}</CardContent>
        </Card>
      </div>
      <div className="z-10 mt-auto mb-28">
        <Button onClick={onConfirm}>Confirm</Button>
      </div>
    </>
  );
};

type PayBolt11ConfirmationProps = {
  /** The bolt11 invoice to pay */
  bolt11: string;
  /** The amount the user inputted or the amount matching their send account*/
  inputAmount: Money;
  /** The account to send from */
  account: CashuAccount;
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
}: PayBolt11ConfirmationProps) => {
  const { description } = decodeBolt11(bolt11);
  const { toast } = useToast();

  const { mutate: createSendQuote, data, error } = useCreateCashuSendQuote();
  const fee = data
    ? toMoney(data.meltQuote.fee_reserve, account.currency)
    : undefined;

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
  const { status } = useCashuSendQuote({
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
      { label: 'Paying', value: formatDestination(bolt11) },
    ],
    [fee, account, bolt11],
  );

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  if (status === 'PAID') {
    return <div>Send successful</div>;
  }

  return (
    <BaseConfirmation amount={inputAmount} onConfirm={handleConfirm}>
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
  const setToken = useSendStore((state) => state.setToken);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setToken({
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
  paymentRequest: PaymentRequest & { type: 'cashu' };
  account: CashuAccount;
}) => {
  const sendUnit = getDefaultUnit(account.currency);
  const decoded = decodePaymentRequest(paymentRequest.raw);
  decoded.description =
    decoded.description ?? 'This is a test to make sure the UI looks good';

  const sendToMintUrl = getSendToMintUrl(decoded, account);

  // always sending from account mint
  // TODO: later account could be anything. If not cashu, then lightning payment is always needed
  const needsCrossMintSwap = sendToMintUrl !== account.mintUrl;

  const { mutate, data } = useMutation({
    mutationFn: async () => {
      if (needsCrossMintSwap) {
        // get quotes to estimate the fee
        const quotes = await getCrossMintQuotes(
          new CashuWallet(new CashuMint(account.mintUrl)),
          new CashuWallet(new CashuMint(sendToMintUrl)),
          // TODO: plug in proofs we have available
          amount.toNumber(sendUnit) + 20, // this is num proofs available, if its greater than the amount, then we can get quotes for the exact amount.
          amount.toNumber(sendUnit),
        );
        const amountToMint = toMoney(quotes.meltQuote.amount, account.currency);
        if (!amountToMint.equals(amount)) {
          // we should be able to prevent this from happening, just put here for now
          // to make sure everything is working
          throw new Error('Amount to mint does not match amount requested');
        }
        // TODO: check account balance with amount + fee
        return {
          quotes,
          fee: toMoney(quotes.meltQuote.fee_reserve, account.currency),
        };
      }
      // TODO: cashu swap fees - here no craoss mint swap is needed,
      // but creating the token will incur a fee if we swap for the correct denomintation
      // WE should be able to calclulate the fee for the swap based on the fees_ppk specified in mint's keyset we are using
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
      // we will need amount + fee in proofs to pay the mint quote
      const _proofAmtRequired = toMoney(
        data.quotes.meltQuote.amount + data.quotes.meltQuote.fee_reserve,
        account.currency,
      );

      const proofsToSwap: Proof[] = []; // TODO: create proofs from account for proofAmtRequired

      // swap the proofs to the mint in the payment request
      const { newProofs, change: _ } = await crossMintSwap(
        new CashuWallet(new CashuMint(account.mintUrl)),
        new CashuWallet(new CashuMint(sendToMintUrl)),
        proofsToSwap,
        data.quotes,
      );
      // TODO: handle change (add to db)
      proofs = newProofs;
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
      { label: 'Paying', value: formatDestination(paymentRequest.raw) },
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
