import type { Currency } from '~/lib/money';
import type { BoardwalkDb, BoardwalkDbAccount } from '../boardwalk-db/database';
import type { Account } from './account';

type CashuAccountInput = Omit<
  Extract<Account, { type: 'cashu' }>,
  'id' | 'createdAt'
>;
type NwcAccountInput = Omit<
  Extract<Account, { type: 'nwc' }>,
  'id' | 'createdAt'
>;
type AccountInput = (CashuAccountInput | NwcAccountInput) & { userId: string };

export class AccountRepository {
  constructor(private readonly db: BoardwalkDb) {}

  /**
   * Gets the account with the given id.
   * @param id - The id of the account to get.
   * @returns The account.
   */
  async get(
    id: string,
    options: {
      abortSignal?: AbortSignal;
    } = {},
  ): Promise<Account> {
    const query = this.db.from('accounts').select().eq('id', id);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get account', error);
    }

    return this.toAccount(data);
  }

  /**
   * Gets all the accounts for the given user.
   * @param userId - The id of the user to get the accounts for.
   * @returns The accounts.
   */
  async getAll(
    userId: string,
    options: {
      abortSignal?: AbortSignal;
    } = {},
  ): Promise<Account[]> {
    const query = this.db.from('accounts').select().eq('user_id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get accounts', error);
    }

    return data.map(this.toAccount);
  }

  /**
   * Creates a single account.
   * @param accountInput - The account to create.
   * @returns The created account.
   */
  async create(
    accountInput: AccountInput,
    options?: { abortSignal?: AbortSignal },
  ): Promise<Account>;
  /**
   * Creates multiple accounts.
   * @param accountInput - The accounts to create.
   * @returns The created accounts.
   */
  async create(
    accountInput: AccountInput[],
    options?: { abortSignal?: AbortSignal },
  ): Promise<Account[]>;
  /**
   * Implementation of create method supporting both single and multiple accounts.
   */
  async create(
    accountInput: AccountInput | AccountInput[],
    options: {
      abortSignal?: AbortSignal;
    } = {},
  ): Promise<Account | Account[]> {
    const inputs = Array.isArray(accountInput) ? accountInput : [accountInput];

    const accountsToCreate = inputs.map((account) => ({
      name: account.name,
      type: account.type,
      currency: account.currency,
      details:
        account.type === 'cashu'
          ? { mint_url: account.mintUrl, is_test_mint: account.isTestMint }
          : { nwc_url: account.nwcUrl },
      user_id: account.userId,
    }));

    const query = this.db.from('accounts').insert(accountsToCreate).select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to store account(s)', error);
    }

    const createdAccounts = data.map(this.toAccount);

    // Return single account if input was single, array if input was array
    return Array.isArray(accountInput) ? createdAccounts : createdAccounts[0];
  }

  private toAccount(data: BoardwalkDbAccount): Account {
    const commonData = {
      id: data.id,
      name: data.name,
      currency: data.currency as Currency,
      createdAt: data.created_at,
    };

    if (data.type === 'cashu') {
      const details = data.details as {
        mint_url: string;
        is_test_mint: boolean;
      };
      return {
        ...commonData,
        type: 'cashu',
        mintUrl: details.mint_url,
        isTestMint: details.is_test_mint,
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
