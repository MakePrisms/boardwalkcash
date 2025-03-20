import type { Proof } from '@cashu/cashu-ts';
import type { DistributedOmit } from 'type-fest';
import type { Currency } from '~/lib/money';
import type { BoardwalkDb, BoardwalkDbAccount } from '../boardwalk-db/database';
import type { Account } from './account';

type AccountInput = DistributedOmit<Account, 'id' | 'createdAt' | 'version'> & {
  userId: string;
};

type Options = {
  abortSignal?: AbortSignal;
};

type OptionsWithEncryption = Options & {
  encryptData: <T = unknown>(data: T) => Promise<string>;
  decryptData: <T = unknown>(data: string) => Promise<T>;
};

export class AccountRepository {
  constructor(private readonly db: BoardwalkDb) {}

  /**
   * Gets the account with the given id.
   * @param id - The id of the account to get.
   * @returns The account.
   */
  async get(id: string, options: OptionsWithEncryption): Promise<Account> {
    const query = this.db.from('accounts').select().eq('id', id);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get account', error);
    }

    return AccountRepository.toAccount(data, options.decryptData);
  }

  /**
   * Gets all the accounts for the given user.
   * @param userId - The id of the user to get the accounts for.
   * @returns The accounts.
   */
  async getAll(
    userId: string,
    options: OptionsWithEncryption,
  ): Promise<Account[]> {
    const query = this.db.from('accounts').select().eq('user_id', userId);

    if (options.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get accounts', error);
    }

    return Promise.all(
      data.map((x) => AccountRepository.toAccount(x, options.decryptData)),
    );
  }

  /**
   * Creates a single account.
   * @param accountInput - The account to create.
   * @returns The created account.
   */
  async create(
    accountInput: AccountInput,
    options: OptionsWithEncryption,
  ): Promise<Account> {
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
              proofs: await options.encryptData(accountInput.proofs),
            }
          : { nwc_url: accountInput.nwcUrl },
      user_id: accountInput.userId,
    };

    const query = this.db.from('accounts').insert(accountsToCreate).select();

    if (options.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const resp = await query.single();
    const { data, error, status } = resp;

    if (error) {
      const message =
        status === 409 && accountInput.type === 'cashu'
          ? 'Account for this mint and currency already exists'
          : 'Failed to create account';
      throw new Error(message, error);
    }

    return AccountRepository.toAccount(data, options.decryptData);
  }

  static async toAccount(
    data: BoardwalkDbAccount,
    decryptData: OptionsWithEncryption['decryptData'],
  ): Promise<Account> {
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
      };
    }

    if (data.type === 'nwc') {
      const details = data.details as { nwc_url: string };
      return {
        ...commonData,
        type: 'nwc',
        nwcUrl: details.nwc_url,
      };
    }

    throw new Error('Invalid account type');
  }
}
