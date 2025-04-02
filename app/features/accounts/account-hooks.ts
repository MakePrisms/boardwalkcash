import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { DistributedOmit } from 'type-fest';
import { checkIsTestMint } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import { useLatest } from '~/lib/use-latest';
import { type BoardwalkDbAccount, boardwalkDb } from '../boardwalk-db/database';
import { useCashuCryptography } from '../shared/cashu';
import type { User } from '../user/user';
import { useUser } from '../user/user-hooks';
import { type Account, type CashuAccount, getAccountBalance } from './account';
import { AccountRepository } from './account-repository';

const accountsQueryKey = 'accounts';

class AccountsCache {
  constructor(
    private readonly queryClient: QueryClient,
    private readonly userId: string,
  ) {}

  add(account: Account) {
    this.queryClient.setQueryData(
      [accountsQueryKey, this.userId],
      (curr: Account[]) => [...curr, account],
    );
  }

  update(account: Account) {
    this.queryClient.setQueryData(
      [accountsQueryKey, this.userId],
      (curr: Account[]) => curr.map((x) => (x.id === account.id ? account : x)),
    );
  }

  getAll() {
    return this.queryClient.getQueryData<Account[]>([
      accountsQueryKey,
      this.userId,
    ]);
  }

  get(id: string) {
    const accounts = this.getAll();
    return accounts?.find((x) => x.id === id);
  }
}

export function useAccountsCache() {
  const queryClient = useQueryClient();
  const userId = useUser((x) => x.id);
  return useMemo(
    () => new AccountsCache(queryClient, userId),
    [queryClient, userId],
  );
}

function isDefaultAccount(user: User, account: Account) {
  if (account.currency === 'BTC') {
    return user.defaultBtcAccountId === account.id;
  }
  if (account.currency === 'USD') {
    return user.defaultUsdAccountId === account.id;
  }
  return false;
}

function useOnAccountChange({
  onCreated,
  onUpdated,
}: {
  onCreated: (account: Account) => void;
  onUpdated: (account: Account) => void;
}) {
  const cashuCryptography = useCashuCryptography();
  const onCreatedRef = useLatest(onCreated);
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    const channel = boardwalkDb
      .channel('accounts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'accounts',
        },
        async (payload: RealtimePostgresChangesPayload<BoardwalkDbAccount>) => {
          if (payload.eventType === 'INSERT') {
            const addedAccount = await AccountRepository.toAccount(
              payload.new,
              cashuCryptography.decrypt,
            );
            onCreatedRef.current(addedAccount);
          } else if (payload.eventType === 'UPDATE') {
            const updatedAccount = await AccountRepository.toAccount(
              payload.new,
              cashuCryptography.decrypt,
            );
            onUpdatedRef.current(updatedAccount);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [cashuCryptography]);
}

export function useTrackAccounts() {
  const accountCache = useAccountsCache();

  useOnAccountChange({
    onCreated: (account) => accountCache.add(account),
    onUpdated: (account) => accountCache.update(account),
  });
}

export function useAccounts(currency?: Currency) {
  const cryptography = useCashuCryptography();
  const userId = useUser((x) => x.id);
  const accountRepository = new AccountRepository(boardwalkDb, cryptography);

  return useSuspenseQuery({
    queryKey: [accountsQueryKey, userId],
    queryFn: () => accountRepository.getAll(userId),
    staleTime: Number.POSITIVE_INFINITY,
    select: (data) => {
      if (!currency) {
        return data;
      }
      return data.filter((x) => x.currency === currency);
    },
  });
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

export function useAddCashuAccount() {
  const userId = useUser((x) => x.id);
  const cryptography = useCashuCryptography();
  const accountRepository = new AccountRepository(boardwalkDb, cryptography);

  const { mutateAsync } = useMutation({
    mutationFn: async (
      account: DistributedOmit<
        CashuAccount,
        | 'id'
        | 'createdAt'
        | 'isTestMint'
        | 'keysetCounters'
        | 'proofs'
        | 'version'
      >,
    ): Promise<CashuAccount> => {
      const isTestMint = await checkIsTestMint(account.mintUrl);

      return accountRepository.create<CashuAccount>({
        ...account,
        userId,
        isTestMint,
        keysetCounters: {},
        proofs: [],
      });
    },
  });

  return mutateAsync;
}

export function useBalance(currency: Currency) {
  const { data: accounts } = useAccounts(currency);
  const balance = accounts.reduce(
    (acc, account) => {
      const accountBalance = getAccountBalance(account);
      return acc.add(accountBalance);
    },
    new Money({ amount: 0, currency }),
  );
  return balance;
}
