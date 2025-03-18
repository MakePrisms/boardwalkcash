import { SparkWallet } from '@buildonspark/spark-sdk';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import type { DistributedOmit } from 'type-fest';
import { useSparkSeed } from '~/features/keys/key-hooks';
import type { Currency } from '~/lib/money';
import { boardwalkDb } from '../boardwalk-db/database';
import type { User } from '../user/user';
import { useUser } from '../user/user-hooks';
import type { Account } from './account';
import { AccountRepository } from './account-repository';

const accountRepository = new AccountRepository(boardwalkDb);

export const accountsQueryKey = 'accounts';

function isDefaultAccount(user: User, account: Account) {
  if (account.currency === 'BTC') {
    return user.defaultBtcAccountId === account.id;
  }
  if (account.currency === 'USD') {
    return user.defaultUsdAccountId === account.id;
  }
  return false;
}

export function useAccounts(currency?: Currency) {
  const userId = useUser((x) => x.id);
  const response = useSuspenseQuery({
    queryKey: [accountsQueryKey, userId],
    queryFn: () => accountRepository.getAll(userId),
  });

  if (!currency) {
    return response;
  }

  return {
    ...response,
    data: response.data.filter((x) => x.currency === currency),
  };
}

export function useAccount(id: string) {
  const { data: accounts } = useAccounts();
  const account = accounts.find((x) => x.id === id);
  if (!account) {
    throw new Error(`Account with id ${id} not found`);
  }

  const user = useUser();

  return { ...account, isDefault: isDefaultAccount(user, account) };
}

export function useDefaultAccount() {
  const defaultCurrency = useUser((x) => x.defaultCurrency);
  const { data: accounts } = useAccounts(defaultCurrency);

  const defaultBtcAccountId = useUser((x) => x.defaultBtcAccountId);
  const defaultUsdccountId = useUser((x) => x.defaultUsdAccountId);

  const defaultAccount = accounts.find(
    (x) =>
      (x.currency === 'BTC' && x.id === defaultBtcAccountId) ||
      (x.currency === 'USD' && x.id === defaultUsdccountId),
  );

  if (!defaultAccount) {
    throw new Error(`No default account found for currency ${defaultCurrency}`);
  }

  return defaultAccount;
}

export function useAddAccount() {
  const queryClient = useQueryClient();
  const userId = useUser((x) => x.id);

  const { mutateAsync } = useMutation({
    mutationFn: (account: DistributedOmit<Account, 'id' | 'createdAt'>) =>
      accountRepository.create({ ...account, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [accountsQueryKey, userId],
      });
    },
  });

  return mutateAsync;
}

// QUESTION: how to make sure this is only used when user has a spark account?
export const useSparkAccount = (network: 'REGTEST' | 'MAINNET') => {
  const { data: privateKey } = useSparkSeed(network);

  const initWallet = async () => {
    const { wallet } = await SparkWallet.create({
      mnemonicOrSeed: privateKey.private_key,
      options: {
        network,
      },
    });
    return wallet;
  };

  const { data: wallet } = useSuspenseQuery({
    queryKey: ['sparkWallet', network],
    queryFn: initWallet,
  });

  return wallet;
};
