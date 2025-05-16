import { Skeleton } from '~/components/ui/skeleton';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import type { Money } from '~/lib/money';
import type { Currency } from '~/lib/money/types';
import { getDefaultUnit } from '../shared/currencies';
import { type Account, getAccountBalance } from './account';
import { useBalance } from './account-hooks';

type AccountBalanceProps = {
  /** Either an account or a currency (for total balance) */
  account: Account | Currency; // TODO: this is a hack for now
};

export function AccountBalance({ account }: AccountBalanceProps) {
  // Determine if we're dealing with an account or just a currency
  const isCurrency = typeof account === 'string';
  const currency = isCurrency ? account : account.currency;

  // Get the appropriate balance
  const accountBalance = isCurrency ? undefined : getAccountBalance(account);
  const totalBalance = isCurrency ? useBalance(account) : undefined;
  const balance = accountBalance || (totalBalance as Money);

  const { data: rate, isLoading: isRateLoading } = useExchangeRate(
    currency === 'BTC' ? 'BTC-USD' : 'USD-BTC',
  );

  // Only show conversion for BTC to USD
  const convertedBalance =
    currency === 'BTC' && rate ? balance.convert('USD', rate) : undefined;

  return (
    <span className="text-muted-foreground text-sm">
      {balance.toLocaleString({ unit: getDefaultUnit(currency) })}
      {currency === 'BTC' &&
        (isRateLoading ? (
          <Skeleton className="ml-1 inline-block h-4 w-10" />
        ) : (
          convertedBalance &&
          ` (~${convertedBalance.toLocaleString({ unit: 'usd' })})`
        ))}
    </span>
  );
}
