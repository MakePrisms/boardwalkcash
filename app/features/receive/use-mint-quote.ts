import { CashuMint, CashuWallet, MintQuoteState } from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';

type UseMintQuoteProps = {
  account: Account & { type: 'cashu' };
  amount: Money;
};

export function useMintQuote({ account, amount }: UseMintQuoteProps) {
  const [isPaid, setIsPaid] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const moneyUnit = cashuUnit === 'usd' ? 'cent' : 'sat';
  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
    unit: cashuUnit,
  });

  const {
    isLoading,
    error,
    data: mintQuote,
  } = useQuery({
    queryKey: ['receive-cashu', account.id, amount.toNumber(moneyUnit)],
    queryFn: async () => {
      const mintQuote = await wallet.createMintQuote(
        amount.toNumber(moneyUnit),
      );
      return mintQuote;
    },
    enabled: shouldFetch,
    retry: 1,
  });

  const { error: checkError } = useQuery({
    queryKey: ['receive-cashu-status', mintQuote?.quote],
    queryFn: async () => {
      if (!mintQuote?.quote) return null;
      const checked = await wallet.checkMintQuote(mintQuote.quote);
      if (checked.state === MintQuoteState.PAID) {
        setIsPaid(true);
      }
      return checked;
    },
    enabled: !!mintQuote && !isPaid,
    refetchInterval: 1500,
    retry: 1,
  });

  return {
    isLoading,
    fetchError: error?.message,
    checkError: checkError?.message,
    isPaid,
    mintQuote,
    startFetching: () => setShouldFetch(true),
  };
}
