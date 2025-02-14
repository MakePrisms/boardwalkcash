import {
  CashuMint,
  CashuWallet,
  type Proof,
  decodePaymentRequest,
} from '@cashu/cashu-ts';
import { useNavigate } from '@remix-run/react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { MoneyDisplay } from '~/components/money-display';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { Account } from '~/features/accounts/account';
import { useAccounts } from '~/features/accounts/use-accounts';
import type { PaymentRequest } from '~/features/send/send-store';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { decodeBolt11 } from '~/lib/bolt11';
import { crossMintSwap, getCrossMintQuotes } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import { getDefaultUnit } from '../shared/currencies';
import { useSendStore } from './send-provider';
import { useSendCashuToken } from './use-send-cashu-token';

const formattedDestintation = (destination: string) => {
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

const MoneyWithConvertedAmount = ({ amount }: { amount: Money }) => {
  const defaultFiatCurrency = 'USD';
  const {
    data: rate,
    error: exchangeRateError,
    isLoading: exchangeRateLoading,
  } = useExchangeRate(
    `${amount.currency}-${amount.currency === 'BTC' ? defaultFiatCurrency : 'BTC'}`,
  );
  const shouldShowConvertedAmount =
    amount.currency === 'BTC' || amount.currency !== defaultFiatCurrency;

  if (exchangeRateLoading) {
    return (
      <div className="flex min-h-[116px] flex-col items-center gap-2">
        <MoneyDisplay money={amount} unit={getDefaultUnit(amount.currency)} />
        {shouldShowConvertedAmount && <Skeleton className="h-6 w-32" />}
      </div>
    );
  }

  return (
    <div className="flex min-h-[116px] flex-col items-center">
      <MoneyDisplay money={amount} unit={getDefaultUnit(amount.currency)} />
      {!exchangeRateError && rate && shouldShowConvertedAmount && (
        <MoneyDisplay
          money={amount.convert(
            amount.currency === 'BTC' ? defaultFiatCurrency : 'BTC',
            rate,
          )}
          unit={getDefaultUnit(
            amount.currency === 'BTC' ? defaultFiatCurrency : 'BTC',
          )}
          variant="secondary"
        />
      )}
    </div>
  );
};

const ConfirmationRow = ({
  label,
  value,
}: { label: string; value: string | React.ReactNode }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
};

const BaseConfirmation = ({
  amount,
  onConfirm,
  children,
}: { amount: Money; children: React.ReactNode; onConfirm: () => void }) => {
  return (
    <>
      <MoneyWithConvertedAmount amount={amount} />
      <Card className="w-full">
        <CardContent className="flex flex-col gap-6">{children}</CardContent>
      </Card>
      <Button onClick={onConfirm}>Confirm</Button>
    </>
  );
};

export const PayBolt11Confirmation = ({
  bolt11,
  amount,
  account,
}: { bolt11: string; amount: Money; account: Account & { type: 'cashu' } }) => {
  const { description } = decodeBolt11(bolt11);
  const { mutate: createMeltQuote, data } = useMutation({
    mutationFn: async () => {
      const wallet = new CashuWallet(new CashuMint(account.mintUrl));
      // create the melt quote to estimate the fee
      const meltQuote = await wallet.createMeltQuote(bolt11);
      return {
        fee: toMoney(meltQuote.fee_reserve, account.currency),
        meltQuote,
      };
    },
  });

  useEffect(() => {
    createMeltQuote();
  }, [createMeltQuote]);

  const handleConfirm = async () => {
    if (data?.meltQuote) {
      const wallet = new CashuWallet(new CashuMint(account.mintUrl));
      // TODO: coin selection
      // 1. get proofs for the amount
      //    - this might require a swap to get the correct denomination.
      //    - If the mint supports NUT-08 (lightning fee return) then it should return change and we don't need to swap first.
      //         - TODO: make sure that if we don't do a swap first that we can get change even for large overpayments
      // 2. melt proofs to pay invoice
      const melt = await wallet.meltProofs(data.meltQuote, [], {
        counter: undefined, // add for deterministic secrets
      });
      // 3. add change back to db
      console.log('melt', melt);
    }
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
      { label: 'Paying', value: formattedDestintation(bolt11) },
    ],
    [data, account, bolt11],
  );

  return (
    <>
      <BaseConfirmation amount={amount} onConfirm={handleConfirm}>
        {confirmationRowData.map((row) => (
          <ConfirmationRow
            key={row.label}
            label={row.label}
            value={row.value}
          />
        ))}
        {description && (
          <p className="text-center text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </BaseConfirmation>
    </>
  );
};

export const CreateCashuTokenConfirmation = ({
  amount,
  account,
}: { amount: Money; account: Account & { type: 'cashu' } }) => {
  // here we are sending a token, so we may need to swap to create the token
  // swapping will incur fees
  const fee = Money.zero(amount.currency);
  const { createSendableToken } = useSendCashuToken();
  const setToken = useSendStore((state) => state.setToken);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    const token = await createSendableToken(amount, account);
    setToken(token);
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

export const PayCashuRequestConfirmation = ({
  amount,
  paymentRequest,
  account,
}: {
  amount: Money;
  paymentRequest: PaymentRequest & { type: 'cashu' };
  account: Account & { type: 'cashu' };
}) => {
  const { data: accounts } = useAccounts();
  // TODO: need to have a mint to send to, but the account should be of any type
  const { createSendableProofs } = useSendCashuToken();
  const sendUnit = getDefaultUnit(account.currency);
  const decoded = decodePaymentRequest(paymentRequest.raw);
  decoded.description = decoded.description ?? 'This is a test';

  // determine the mint to send to
  let mintUrl = account.mintUrl;
  if (decoded.mints?.length) {
    if (decoded.mints.includes(account.mintUrl)) {
      // Use selected account's mint if it's in the list
      mintUrl = account.mintUrl;
    } else {
      // Try to find another account that is specified in the payment request
      const matchingAccount = accounts.find(
        (a) => a.type === 'cashu' && decoded.mints?.includes(a.mintUrl),
      ) as (Account & { type: 'cashu' }) | undefined;
      if (matchingAccount?.mintUrl) {
        mintUrl = matchingAccount.mintUrl;
      } else {
        // Fall back to first mint in list
        mintUrl = decoded.mints[0];
      }
    }
  } // else we are sending to the user selected account

  // always sending from account mint
  const needsCrossMintSwap = mintUrl !== account.mintUrl;

  const { mutate, data } = useMutation({
    mutationFn: async () => {
      if (needsCrossMintSwap) {
        // get quotes to estimate the fee
        const quotes = await getCrossMintQuotes(
          new CashuWallet(new CashuMint(account.mintUrl)),
          new CashuWallet(new CashuMint(mintUrl)),
          amount.toNumber(sendUnit) + 20, // this is num proofs available, if its greater than the amount, then we can get quotes for the exact amount.
          amount.toNumber(sendUnit),
        );
        const amountToMint = toMoney(quotes.amountToMint, account.currency);
        if (!amountToMint.equals(amount)) {
          // we should be able to prevent this from happening, just put here for now
          // to make sure everything is working
          throw new Error('Amount to mint does not match amount requested');
        }
        return {
          quotes,
          fee: toMoney(quotes.meltQuote.fee_reserve, account.currency),
        };
      }
      // TODO: cashu swap fees - no craoss mint swap needed,
      // but creating the token will incur a fee if we swap
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
      // we will need amountToMint in proofs to pay the mint quote
      const amountToMint = toMoney(data.quotes.amountToMint, account.currency);
      const proofsToSend = createSendableProofs(amountToMint, account);

      // swap the proofs to the mint in the payment request
      const { newProofs, change: _ } = await crossMintSwap(
        new CashuWallet(new CashuMint(account.mintUrl)),
        new CashuWallet(new CashuMint(mintUrl)),
        proofsToSend,
        data.quotes,
      );
      // TODO: handle change (add to db)
      proofs = newProofs;
    } else {
      // create proofs from same mint
      proofs = createSendableProofs(amount, account);
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
        value: formattedDestintation(
          mintUrl.replace('https://', '').replace('http://', ''),
        ),
      },
      { label: 'Paying', value: formattedDestintation(paymentRequest.raw) },
    ],
    [data, account, mintUrl, paymentRequest],
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
