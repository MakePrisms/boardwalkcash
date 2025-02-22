import type { DistributedOmit } from 'type-fest';
import type { Currency } from '~/lib/money';
import type { Account } from '../accounts/account';
import type {
  BoardwalkDb,
  BoardwalkDbAccount,
  BoardwalkDbUser,
} from '../boardwalk-db/database';

export class UserRepository {
  constructor(private readonly db: BoardwalkDb) {}

  /**
   * Gets a user from the database.
   * @param userId - The id of the user to get.
   * @returns The user.
   */
  async get(userId: string, options?: { abortSignal?: AbortSignal }) {
    const query = this.db.from('users').select().eq('id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get user', error);
    }

    return data;
  }

  /**
   * Updates a user in the database.
   * @param user - The user to update. All specified properties will be updated.
   * @returns The updated user.
   */
  async update(
    user: Partial<Omit<BoardwalkDbUser, 'id' | 'created_at' | 'updated_at'>> & {
      id: string;
    },
    options?: { abortSignal?: AbortSignal },
  ) {
    const query = this.db.from('users').update(user).eq('id', user.id).select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to update user', error);
    }

    return data;
  }

  /**
   * Inserts a user into the database. If the user already exists, it updates the user.
   * @param user - The user to upsert.
   * @returns The upserted user.
   */
  async upsert(
    user: {
      /**
       * Id of the user to insert.
       */
      id: string;
      /**
       * Email of the user to insert or new email to update for existing user.
       */
      email?: string | null | undefined;
      /**
       * Email verfified flag for the user to insert or new value to update for existing user.
       */
      email_verified: boolean;
      /**
       * Accounts to insert for the user.
       * Will be used only when the account is created. For existing users, the accounts will be ignored.
       */
      accounts: DistributedOmit<Account, 'id' | 'createdAt'>[];
    },
    options?: { abortSignal?: AbortSignal },
  ) {
    const accounts = user.accounts.map((account) => ({
      name: account.name,
      type: account.type,
      currency: account.currency,
      details:
        account.type === 'cashu'
          ? { mint_url: account.mintUrl }
          : { nwc_url: account.nwcUrl },
    }));

    const query = this.db.rpc('upsert_user_with_accounts', {
      user_id: user.id,
      email: user.email ?? null,
      email_verified: user.email_verified,
      accounts: accounts,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to upsert user', error);
    }

    return { ...data, accounts: data.accounts.map(this.toAccount) };
  }

  private toAccount(data: BoardwalkDbAccount): Account {
    const commonData = {
      id: data.id,
      name: data.name,
      currency: data.currency as Currency,
      createdAt: data.created_at,
    };

    if (data.type === 'cashu') {
      const details = data.details as { mint_url: string };
      return {
        ...commonData,
        type: 'cashu',
        mintUrl: details.mint_url,
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
