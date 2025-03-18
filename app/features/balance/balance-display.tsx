import { Skeleton } from '~/components/ui/skeleton';
import type { Currency, Money } from '~/lib/money';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { useUser } from '../user/user-hooks';
import { useBalance } from './use-balance';

export function BalanceDisplay() {
  const { balanceBTC, balanceUSD, isLoading } = useBalance();
  const defaultCurrency = useUser((s) => s.defaultCurrency);
  const balance =
    defaultCurrency.toUpperCase() === 'BTC' ? balanceBTC : balanceUSD;

  if (isLoading) {
    return <Skeleton className="h-[32px] w-[128px]" />;
  }

  return <MoneyWithConvertedAmount money={balance as Money<Currency>} />;
}
