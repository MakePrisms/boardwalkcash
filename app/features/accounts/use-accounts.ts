import { useSuspenseQuery } from '@tanstack/react-query';
import type { Currency } from '~/lib/money';
import { boardwalkDb } from '../boardwalk-db/database';
import type { User } from '../user/user';
import { useUser } from '../user/user-hooks';
import type { Account } from './account';
import { AccountRepository } from './account-repository';

const accountRepository = new AccountRepository(boardwalkDb);

const queryKey = 'accounts';

const isDefaultAccount = (account: Account, user: User) => {
  if (account.currency === 'BTC') {
    return user.defaultBtcAccountId === account.id;
  }
  if (account.currency === 'USD') {
    return user.defaultUsdAccountId === account.id;
  }
  return false;
};

export function useAccounts(currency?: Currency) {
  const userId = useUser((x) => x.id);
  const response = useSuspenseQuery({
    queryKey: [queryKey, userId],
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
    // TODO: this should probably be changed to do a redirect to not found page
    throw new Error(`Account with id ${id} not found`);
  }

  const user = useUser();

  return { ...account, isDefault: isDefaultAccount(account, user) };
}

export const useDefaultAccount = () => {
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
};
