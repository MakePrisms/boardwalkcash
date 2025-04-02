import type { Proof } from '@cashu/cashu-ts';
import type { DistributedOmit } from 'type-fest';
import type { Currency } from '~/lib/money';
import type { BoardwalkDb, BoardwalkDbAccount } from '../boardwalk-db/database';
import type { Account } from './account';

type AccountInput<T extends Account> = DistributedOmit<
  T,
  'id' | 'createdAt' | 'version'
> & {
  userId: string;
};

type Options = {
  abortSignal?: AbortSignal;
};

type Encryption = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

export class AccountRepository {
  constructor(
    private readonly db: BoardwalkDb,
    private readonly encryption: Encryption,
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

    return AccountRepository.toAccount(data, this.encryption.decrypt);
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

    return Promise.all(
      data.map((x) => AccountRepository.toAccount(x, this.encryption.decrypt)),
    );
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
              proofs: await this.encryption.encrypt(accountInput.proofs),
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

    return AccountRepository.toAccount<T>(data, this.encryption.decrypt);
  }

  static async toAccount<T extends Account = Account>(
    data: BoardwalkDbAccount,
    decryptData: Encryption['decrypt'],
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
      return {
        ...commonData,
        type: 'cashu',
        mintUrl: details.mint_url,
        isTestMint: details.is_test_mint,
        keysetCounters: details.keyset_counters,
        proofs: await decryptData<Proof[]>(details.proofs),
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
}
