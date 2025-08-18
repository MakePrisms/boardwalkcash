import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  type UseSuspenseQueryResult,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { DistributedOmit } from 'type-fest';
import { checkIsTestMint, getCashuUnit, getCashuWallet } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import { useSupabaseRealtimeSubscription } from '~/lib/supabase/supabase-realtime';
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
 * Hook that provides the wallet preloading function.
 * @returns Function to preload a wallet for a given mint URL and currency.
 */
function useGetPreloadedWallet() {
  const queryClient = useQueryClient();
  const cashuCryptography = useCashuCryptography();

  return useCallback(
    async (mintUrl: string, currency: Currency) => {
      return queryClient.fetchQuery({
        queryKey: ['wallet', mintUrl, currency],
        queryFn: async () => {
          const seed = await cashuCryptography.getSeed();
          const wallet = getCashuWallet(mintUrl, {
            unit: getCashuUnit(currency),
            bip39seed: seed,
          });
          await wallet.loadMint();
          return wallet;
        },
        staleTime: Number.POSITIVE_INFINITY,
        retry: 3,
      });
    },
    [queryClient, cashuCryptography],
  );
}

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

export class AccountsCache {
  private readonly accountVersionsCache;

  constructor(private readonly queryClient: QueryClient) {
    this.accountVersionsCache = new AccountVersionsCache(queryClient, this);
  }

  upsert(account: Account) {
    this.accountVersionsCache.updateLatestVersionIfStale(
      account.id,
      account.version,
    );

    this.queryClient.setQueryData([accountsQueryKey], (curr: Account[]) => {
      const existingAccountIndex = curr.findIndex((x) => x.id === account.id);
      if (existingAccountIndex !== -1) {
        return curr.map((x) => (x.id === account.id ? account : x));
      }
      return [...curr, account];
    });
  }

  update(account: Account) {
    this.accountVersionsCache.updateLatestVersionIfStale(
      account.id,
      account.version,
    );

    this.queryClient.setQueryData([accountsQueryKey], (curr: Account[]) =>
      curr.map((x) => (x.id === account.id ? account : x)),
    );
  }

  /**
   * Gets all accounts.
   * Each account returned is the last version for which we have a full account data.
   * @returns The list of accounts.
   */
  getAll() {
    return this.queryClient.getQueryData<Account[]>([accountsQueryKey]);
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
        event.query.queryKey.length === 1 &&
        event.query.queryKey[0] === accountsQueryKey
      ) {
        callback(event.query.state.data);
      }
    });
  }
}

/**
 * Hook that provides the accounts cache.
 * Reference of the returned data is stable as long as the logged in user doesn't change (see App component in root.tsx).
 * @returns The accounts cache.
 */
export function useAccountsCache() {
  const queryClient = useQueryClient();
  // The query client is a singleton created in the root of the app (see App component in root.tsx).
  return useMemo(() => new AccountsCache(queryClient), [queryClient]);
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
  const queryClient = useQueryClient();

  return useSupabaseRealtimeSubscription({
    channelFactory: () =>
      agicashDb.channel('accounts').on(
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
      ),
    onReconnected: () => {
      // Invalidate the accounts query so that the accounts are re-fetched and the cache is updated.
      // This is needed to get any data that might have been updated while the re-connection was in progress.
      queryClient.invalidateQueries({ queryKey: [accountsQueryKey] });
    },
  });
}

export function useTrackAccounts() {
  // Makes sure the accounts are loaded in the cache.
  useAccounts();

  const accountCache = useAccountsCache();

  return useOnAccountChange({
    onCreated: (account) => accountCache.upsert(account),
    onUpdated: (account) => accountCache.update(account),
  });
}

export function useAccounts<T extends AccountType = AccountType>(select?: {
  currency?: Currency;
  type?: T;
}): UseSuspenseQueryResult<ExtendedAccount<T>[]> {
  const user = useUser();
  const accountRepository = useAccountRepository();
  const getPreloadedWallet = useGetPreloadedWallet();

  return useSuspenseQuery({
    queryKey: [accountsQueryKey],
    queryFn: async () => {
      const data = await accountRepository.getAll(user.id);

      // Preload wallets for cashu accounts
      const dataWithWallets = await Promise.all(
        data.map(async (x) =>
          x.type === 'cashu'
            ? {
                ...x,
                wallet: await getPreloadedWallet(x.mintUrl, x.currency),
              }
            : x,
        ),
      );

      return dataWithWallets;
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    select: (data) => {
      const extendedData = data.map((x) => ({
        ...x,
        isDefault: isDefaultAccount(user, x),
      }));

      // Sort the default account to the top
      const sortedData = extendedData.sort((_, b) => (b.isDefault ? 1 : -1));

      if (!select) {
        return sortedData as unknown as ExtendedAccount<T>[];
      }

      // Apply filtering based on select parameters
      const filteredData = sortedData.filter((account) => {
        // Type narrowing through discriminated union pattern
        if (select.currency && account.currency !== select.currency) {
          return false;
        }
        if (select.type && account.type !== select.type) {
          return false;
        }
        return true;
      });

      return filteredData as unknown as ExtendedAccount<T>[];
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
  const { data: accounts } = useAccounts();
  const account = accounts.find((x) => x.id === id);

  if (!account) {
    throw new Error(`Account with id ${id} not found`);
  }

  return account as T;
}

type AccountTypeMap = {
  cashu: CashuAccount;
};

/**
 * Hook to get the method which return the latest version of the account.
 * If we know that the account was updated but we don't have the full account data yet, we can use this hook to wait for the account data to be updated in the cache.
 * Prefer using this hook whenever using the account's version property to minimize the errors that result in retries which are caused by using the old version of the account.
 * @param type - The type of the account to get the latest version of. If provided the type of the returned account will be narrowed.
 * @returns The latest version of the account.
 * @throws Error if the account is not found.
 */
export function useGetLatestAccount<T extends keyof AccountTypeMap>(
  type: T,
): (id: string) => Promise<ExtendedAccount<T>>;
export function useGetLatestAccount(
  type?: undefined,
): (id: string) => Promise<ExtendedAccount>;
export function useGetLatestAccount(type?: keyof AccountTypeMap) {
  const accountsCache = useAccountsCache();
  const getPreloadedWallet = useGetPreloadedWallet();
  const user = useUser();

  return useCallback(
    async (id: string) => {
      const account = await accountsCache.getLatest(id);
      if (!account) {
        throw new Error(`Account not found for id: ${id}`);
      }
      if (type && account.type !== type) {
        throw new Error(`Account with id: ${id} is not of type: ${type}`);
      }

      const extendedAccount = {
        ...account,
        isDefault: isDefaultAccount(user, account),
      };

      // For cashu accounts, attach the preloaded wallet
      if (account.type === 'cashu') {
        const wallet = await getPreloadedWallet(
          account.mintUrl,
          account.currency,
        );
        return { ...extendedAccount, wallet };
      }

      return extendedAccount;
    },
    [accountsCache, type, getPreloadedWallet, user],
  );
}

/**
 * Hook to get the method which return the latest version of the cashu account.
 * If we know that the account was updated but we don't have the full account data yet, we can use this hook to wait for the account data to be updated in the cache.
 * Prefer using this hook whenever using the account's version property to minimize the errors that result in retries which are caused by using the old version of the account.
 * @returns The latest version of the cashu account.
 * @throws Error if the account is not found.
 */
export function useGetLatestCashuAccount() {
  return useGetLatestAccount('cashu');
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
  const accountCache = useAccountsCache();

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
    onSuccess: (account) => {
      // We add the account as soon as it is created so that it is available in the cache immediately.
      // This is important when using other hooks that are trying to use the account immediately after it is created.
      accountCache.upsert(account);
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
