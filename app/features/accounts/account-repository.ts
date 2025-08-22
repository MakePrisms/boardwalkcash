import type { Proof } from '@cashu/cashu-ts';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { DistributedOmit } from 'type-fest';
import { getCashuUnit, getCashuWallet } from '~/lib/cashu';
import type { Currency } from '~/lib/money';
import {
  type AgicashDb,
  type AgicashDbAccount,
  agicashDb,
} from '../agicash-db/database';
import { useCashuCryptography } from '../shared/cashu';
import { cashuAuthStore } from '../shared/cashu-mint-authentication';
import type { Account } from './account';

type CashuAccountInput = DistributedOmit<
  Extract<Account, { type: 'cashu' }>,
  'id' | 'createdAt' | 'version' | 'wallet'
> & {
  userId: string;
};

type NwcAccountInput = DistributedOmit<
  Extract<Account, { type: 'nwc' }>,
  'id' | 'createdAt' | 'version'
> & {
  userId: string;
};

type AccountInput<T extends Account> = T extends { type: 'cashu' }
  ? CashuAccountInput
  : T extends { type: 'nwc' }
    ? NwcAccountInput
    : never;

type Options = {
  abortSignal?: AbortSignal;
};

type Cryptography = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
  /** An optional method to get the bip39 seed for a cashu account.
   * If not provided, cashu wallets will be created without a seed.
   */
  getSeed?: () => Promise<Uint8Array>;
};

export class AccountRepository {
  constructor(
    private readonly db: AgicashDb,
    private readonly cryptography: Cryptography,
    private readonly queryClient: QueryClient,
  ) {}

  /**
   * Gets the account with the given id.
   * @param id - The id of the account to get.
   * @returns The account.
   */
  async get(id: string, options?: Options): Promise<Account> {
    const query = this.db.from('accounts').select().eq('id', id);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get account', { cause: error });
    }

    return this.toAccount(data);
  }

  /**
   * Gets all the accounts for the given user.
   * @param userId - The id of the user to get the accounts for.
   * @returns The accounts.
   */
  async getAll(userId: string, options?: Options): Promise<Account[]> {
    const query = this.db.from('accounts').select().eq('user_id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get accounts', { cause: error });
    }

    return Promise.all(data.map((x) => this.toAccount(x)));
  }

  /**
   * Creates a single account.
   * @param accountInput - The account to create.
   * @returns The created account.
   */
  async create<T extends Account = Account>(
    accountInput: AccountInput<T>,
    options?: Options,
  ): Promise<T> {
    const accountsToCreate = {
      name: accountInput.name,
      type: accountInput.type,
      currency: accountInput.currency,
      details:
        accountInput.type === 'cashu'
          ? {
              mint_url: accountInput.mintUrl,
              is_test_mint: accountInput.isTestMint,
              keyset_counters: accountInput.keysetCounters,
              proofs: await this.cryptography.encrypt(accountInput.proofs),
            }
          : { nwc_url: accountInput.nwcUrl },
      user_id: accountInput.userId,
    };

    const query = this.db.from('accounts').insert(accountsToCreate).select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const resp = await query.single();
    const { data, error, status } = resp;

    if (error) {
      const message =
        status === 409 && accountInput.type === 'cashu'
          ? 'Account for this mint and currency already exists'
          : 'Failed to create account';
      throw new Error(message, { cause: error });
    }

    return this.toAccount<T>(data);
  }

  async toAccount<T extends Account = Account>(
    data: AgicashDbAccount,
  ): Promise<T> {
    const commonData = {
      id: data.id,
      name: data.name,
      currency: data.currency as Currency,
      createdAt: data.created_at,
      version: data.version,
    };

    if (data.type === 'cashu') {
      const details = data.details as {
        mint_url: string;
        is_test_mint: boolean;
        keyset_counters: Record<string, number>;
        proofs: string;
      };

      const wallet = await this.getPreloadedWallet(
        details.mint_url,
        data.currency,
      );

      return {
        ...commonData,
        type: 'cashu',
        mintUrl: details.mint_url,
        isTestMint: details.is_test_mint,
        keysetCounters: details.keyset_counters,
        proofs: await this.cryptography.decrypt<Proof[]>(details.proofs),
        wallet,
      } as T;
    }

    if (data.type === 'nwc') {
      const details = data.details as { nwc_url: string };
      return {
        ...commonData,
        type: 'nwc',
        nwcUrl: details.nwc_url,
      } as T;
    }

    throw new Error('Invalid account type');
  }

  private async getPreloadedWallet(mintUrl: string, currency: Currency) {
    const seed = await this.cryptography.getSeed?.();

    const getClearAuthToken = async () => {
      const token = await cashuAuthStore
        .getState()
        .getClearAuthTokenWithRefresh(mintUrl);
      if (!token) {
        throw new Error(`No clear auth token available for mint ${mintUrl}`);
      }
      return token;
    };

    return this.queryClient.fetchQuery({
      queryKey: ['preloaded-wallet', mintUrl, currency],
      queryFn: async () => {
        const wallet = getCashuWallet(mintUrl, {
          unit: getCashuUnit(currency),
          bip39seed: seed ?? undefined,
          getClearAuthToken,
          getBlindAuthToken: () =>
            cashuAuthStore.getState().getAndConsumeBlindAuthToken(mintUrl),
        });
        await wallet.loadMint();
        return wallet;
      },
      staleTime: Number.POSITIVE_INFINITY,
    });
  }
}

export function useAccountRepository() {
  const cryptography = useCashuCryptography();
  const queryClient = useQueryClient();
  return new AccountRepository(agicashDb, cryptography, queryClient);
}
