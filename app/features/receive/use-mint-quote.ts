import { CashuMint, CashuWallet, MintQuoteState } from '@cashu/cashu-ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';

type UseMintQuoteProps = {
  /** The Cashu account to create a mint quote for. */
  account: Account & { type: 'cashu' };
  /**
   * The amount to create a mint quote for.
   * The amount's currency must match the account's currency.
   */
  amount: Money;
};

/**
 * A hook to create a mint quote for a Cashu account and then poll the
 * status of the quote
 */
export function useMintQuote({ account, amount }: UseMintQuoteProps) {
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const moneyUnit = cashuUnit === 'usd' ? 'cent' : 'sat';
  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
    unit: cashuUnit,
  });
  const hasCreatedQuote = useRef(false);

  if (amount.currency !== account.currency) {
    throw new Error('Amount currency must match account currency');
  }

  const {
    status,
    error,
    data: mintQuote,
    mutate,
  } = useMutation({
    mutationKey: ['receive-cashu', account.id, amount.toNumber(moneyUnit)],
    mutationFn: () => wallet.createMintQuote(amount.toNumber(moneyUnit)),
    retry: 1,
  });

  const { data, error: checkError } = useQuery({
    queryKey: ['receive-cashu-status', mintQuote?.quote],
    queryFn: () => wallet.checkMintQuote(mintQuote?.quote ?? ''),
    enabled: !!mintQuote,
    refetchInterval: ({ state: { data } }) => {
      return data?.state === MintQuoteState.PAID ? false : 1500;
    },
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const createQuoteIfNeeded = useCallback(
    (shouldCreate: boolean) => {
      if (shouldCreate && !hasCreatedQuote.current) {
        mutate();
        hasCreatedQuote.current = true;
      }
    },
    [mutate],
  );

  return {
    isLoading: status === 'pending',
    fetchError: error?.message,
    checkError: checkError?.message,
    isPaid: data?.state === MintQuoteState.PAID,
    mintQuote,
    createQuoteIfNeeded,
  };
}
