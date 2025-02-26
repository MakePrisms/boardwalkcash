import { type Currency, Money } from '~/lib/money';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { useTheme } from '../theme';

export function BalanceDisplay() {
  const { theme: defaultCurrency } = useTheme();

  const balanceBTC = new Money({ amount: 1583, currency: 'BTC', unit: 'sat' });
  const balanceUSD = new Money({ amount: 0, currency: 'USD' });

  const balance =
    defaultCurrency.toUpperCase() === 'BTC' ? balanceBTC : balanceUSD;

  return <MoneyWithConvertedAmount money={balance as Money<Currency>} />;
}
