import { useQuery } from '@tanstack/react-query';
import { useSparkAccount } from '~/features/accounts/account-hooks';
import { Money } from '~/lib/money';

export const balanceQueryKey = 'balance';
const sparkNetwork = 'REGTEST';

export const useSparkBalance = () => {
  const sparkWallet = useSparkAccount(sparkNetwork);
  const { data, isLoading, refetch } = useQuery({
    queryKey: [balanceQueryKey, sparkNetwork],
    queryFn: () => sparkWallet.getBalance(),
  });

  const balance = new Money({
    amount: Number(data?.balance ?? 0),
    currency: 'BTC',
    unit: 'sat',
  });

  return {
    balance,
    isLoading,
    refetch,
  };
};

export const useBalance = () => {
  const { balance: sparkBalance, isLoading } = useSparkBalance();

  const balanceBTC = sparkBalance;
  const balanceUSD = new Money({ amount: 0, currency: 'USD' });

  return {
    balanceBTC,
    balanceUSD,
    isLoading,
  };
};
