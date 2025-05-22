import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  type UseSuspenseQueryResult,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { DistributedOmit } from 'type-fest';
import { checkIsTestMint } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import { useLatest } from '~/lib/use-latest';
import { type AgicashDbAccount, agicashDb } from '../agicash-db/database';
import { useCashuCryptography } from '../shared/cashu';
import type { User } from '../user/user';
import { useUser } from '../user/user-hooks';
import {
  type Account,
  type AccountType,
  type CashuAccount,
  type ExtendedAccount,
  getAccountBalance,
} from './account';
import { AccountRepository, useAccountRepository } from './account-repository';

const accountsQueryKey = 'accounts';
const accountVersionsQueryKey = 'account-versions';

/**
 * Cache that stores the latest known version of each account.
 * This is used when we have the information about the latest version of the account before we have the full account data.
 */
class AccountVersionsCache {
  constructor(
    private readonly queryClient: QueryClient,
    private readonly accountsCache: AccountsCache,
  ) {}

  /**
   * Get the latest known version of the account.
   * @param accountId - The id of the account.
   * @returns The latest known version of the account or -1 if the account is not found.
   */
  getLatestVersion(accountId: string) {
    const version = this.queryClient.getQueryData<number>([
      accountVersionsQueryKey,
      accountId,
    ]);

    if (version) {
      return version;
    }

    const account = this.accountsCache.get(accountId);
    if (!account) {
      return -1;
    }

    return account.version;
  }

  /**
   * Update the latest known version of the account if it is stale.
   * @param accountId - The id of the account.
   * @param version - The new version of the account. If the version passed is lower than the latest known version, it will be ignored.
   */
  updateLatestVersionIfStale(accountId: string, version: number) {
    const latestVersion = this.getLatestVersion(accountId);
    if (latestVersion < version) {
      this.queryClient.setQueryData<number>(
        [accountVersionsQueryKey, accountId],
        version,
      );
    }
  }
}

class AccountsCache {
  private readonly accountVersionsCache;

  constructor(
    private readonly queryClient: QueryClient,
    private readonly userId: string,
  ) {
    this.accountVersionsCache = new AccountVersionsCache(queryClient, this);
  }

  add(account: Account) {
    this.accountVersionsCache.updateLatestVersionIfStale(
      account.id,
      account.version,
    );

    this.queryClient.setQueryData(
      [accountsQueryKey, this.userId],
      (curr: Account[]) => [...curr, account],
    );
  }

  update(account: Account) {
    this.accountVersionsCache.updateLatestVersionIfStale(
      account.id,
      account.version,
    );

    this.queryClient.setQueryData(
      [accountsQueryKey, this.userId],
      (curr: Account[]) => curr.map((x) => (x.id === account.id ? account : x)),
    );
  }

  /**
   * Gets all accounts.
   * Each account returned is the last version for which we have a full account data.
   * @returns The list of accounts.
   */
  getAll() {
    return this.queryClient.getQueryData<Account[]>([
      accountsQueryKey,
      this.userId,
    ]);
  }

  /**
   * Get an account by id.
   * Returns the last version of the account for which we have a full account data.
   * @param id - The id of the account.
   * @returns The account or null if the account is not found.
   */
  get(id: string) {
    const accounts = this.getAll();
    return accounts?.find((x) => x.id === id) ?? null;
  }

  /**
   * Set the latest known version of an account.
   * Use when we know the latest version of an account before we can update the account data in cache. `getLatest` can then be used to wait for the account to be updated with the latest data.
   * @param id - The id of the account.
   * @param version - The new version of the account. If the version passed is lower than the latest known version, it will be ignored.
   */
  setLatestVersion(id: string, version: number) {
    this.accountVersionsCache.updateLatestVersionIfStale(id, version);
  }

  /**
   * Get the latest account by id.
   * Returns the latest version of the account. If we don't have the full data for the latest known version yet, this will wait for the account data to be updated.
   * @param id - The id of the account.
   * @returns The latest account or null if the account is not found.
   */
  async getLatest(id: string): Promise<Account | null> {
    const latestKnownVersion = this.accountVersionsCache.getLatestVersion(id);

    const account = this.get(id);
    if (!account || account.version >= latestKnownVersion) {
      return account;
    }

    return new Promise<Account | null>((resolve) => {
      const unsubscribe = this.subscribe((accounts) => {
        const updatedAccount = accounts.find((x) => x.id === id);
        if (!updatedAccount) {
          resolve(null);
          unsubscribe();
          return;
        }

        if (updatedAccount.version >= latestKnownVersion) {
          this.accountVersionsCache.updateLatestVersionIfStale(
            id,
            updatedAccount.version,
          );
          resolve(updatedAccount);
          unsubscribe();
        }
      });
    });
  }

  /**
   * Subscribe to changes in the accounts cache.
   * @param callback - The callback to call when the accounts cache changes.
   * @returns A function to unsubscribe from the accounts cache.
   */
  private subscribe(callback: (accounts: Account[]) => void) {
    const cache = this.queryClient.getQueryCache();
    return cache.subscribe((event) => {
      if (
        event.query.queryKey.length === 2 &&
        event.query.queryKey[0] === accountsQueryKey &&
        event.query.queryKey[1] === this.userId
      ) {
        callback(event.query.state.data);
      }
    });
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
  const accountCache = useAccountsCache();

  useEffect(() => {
    const channel = agicashDb
      .channel('accounts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'accounts',
        },
        async (payload: RealtimePostgresChangesPayload<AgicashDbAccount>) => {
          if (payload.eventType === 'INSERT') {
            const addedAccount = await AccountRepository.toAccount(
              payload.new,
              cashuCryptography.decrypt,
            );
            onCreatedRef.current(addedAccount);
          } else if (payload.eventType === 'UPDATE') {
            // We are updating the latest known version of the account here so anyone who needs the latest version (who uses account cache `getLatest`)
            // can know as soon as possible and thus can wait for the account data to be decrypted and updated in the cache instead of processing the old version.
            accountCache.setLatestVersion(payload.new.id, payload.new.version);

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
  }, [cashuCryptography, accountCache]);
}

export function useTrackAccounts() {
  // Makes sure the accounts are loaded in the cache.
  useAccounts();

  const accountCache = useAccountsCache();

  useOnAccountChange({
    onCreated: (account) => accountCache.add(account),
    onUpdated: (account) => accountCache.update(account),
  });
}

export function useAccounts<T extends AccountType = AccountType>(select?: {
  currency?: Currency;
  type?: T;
}): UseSuspenseQueryResult<ExtendedAccount<T>[]> {
  const user = useUser();
  const accountRepository = useAccountRepository();

  return useSuspenseQuery({
    queryKey: [accountsQueryKey, user.id],
    queryFn: () => accountRepository.getAll(user.id),
    staleTime: Number.POSITIVE_INFINITY,
    select: (data) => {
      const extendedData = data
        .map((x) => ({
          ...x,
          isDefault: isDefaultAccount(user, x),
        }))
        .sort((_, b) => (b.isDefault ? 1 : -1)); // Sort the default account to the top

      if (!select) {
        return extendedData as ExtendedAccount<T>[];
      }

      const filteredData = extendedData.filter(
        (account): account is ExtendedAccount<T> => {
          if (select.currency && account.currency !== select.currency) {
            return false;
          }
          if (select.type && account.type !== select.type) {
            return false;
          }
          return true;
        },
      );

      return filteredData;
    },
  });
}

/**
 * Hook to get an account by ID.
 * @param id - The ID of the account to retrieve.
 * @returns The specified account.
 * @throws Error if the account is not found.
 */
export function useAccount<T extends ExtendedAccount = ExtendedAccount>(
  id: string,
) {
  const user = useUser();
  const { data: accounts } = useAccounts();
  const account = accounts.find((x) => x.id === id);

  if (!account) {
    throw new Error(`Account with id ${id} not found`);
  }

  return { ...account, isDefault: isDefaultAccount(user, account) } as T;
}

export function useDefaultAccount() {
  const defaultCurrency = useUser((x) => x.defaultCurrency);
  const { data: accounts } = useAccounts({ currency: defaultCurrency });

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
  const accountRepository = useAccountRepository();

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
  const { data: accounts } = useAccounts({ currency });
  const balance = accounts.reduce(
    (acc, account) => {
      const accountBalance = getAccountBalance(account);
      return acc.add(accountBalance);
    },
    new Money({ amount: 0, currency }),
  );
  return balance;
}
