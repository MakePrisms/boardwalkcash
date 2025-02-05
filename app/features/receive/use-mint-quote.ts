import { CashuMint, CashuWallet, MintQuoteState } from '@cashu/cashu-ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Currency, CurrencyUnit, Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';

type UseMintQuoteProps<C extends Currency> = {
  /** The Cashu account to create a mint quote for. */
  account: Account<C> & { type: 'cashu' };
  /**
   * The amount to create a mint quote for.
   * The amount's currency must match the account's currency.
   */
  amount: Money<C>;
};

/**
 * A hook to create a mint quote for a Cashu account and then poll the
 * status of the quote
 */
export function useMintQuote<C extends Currency>({
  account,
  amount,
}: UseMintQuoteProps<C>) {
  const cashuUnit = (
    account.currency === 'USD' ? 'usd' : 'sat'
  ) as CurrencyUnit<C>;
  const moneyUnit = (cashuUnit === 'usd' ? 'cent' : 'sat') as CurrencyUnit<C>;
  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
    unit: cashuUnit,
  });

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

  return {
    isLoading: status === 'pending',
    fetchError: error?.message,
    checkError: checkError?.message,
    isPaid: data?.state === MintQuoteState.PAID,
    mintQuote,
    createQuote: mutate,
  };
}
