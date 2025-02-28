import type { DistributedOmit } from 'type-fest';
import type { Currency } from '~/lib/money';
import type { Account } from '../accounts/account';
import { AccountRepository } from '../accounts/account-repository';
import type { BoardwalkDb, BoardwalkDbUser } from '../boardwalk-db/database';
import type { User } from './user';

export type UpdateUser = {
  defaultBtcAccountId?: string;
  defaultUsdAccountId?: string;
  defaultCurrency?: Currency;
};

export type UpdateProfile = {
  username?: string;
};

export class UserRepository {
  constructor(private readonly db: BoardwalkDb) {}

  /**
   * Gets a user from the database.
   * @param userId - The id of the user to get.
   * @returns The user.
   */
  async get(
    userId: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<User> {
    const query = this.db.from('users').select().eq('id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get user', error);
    }

    return this.toUser(data);
  }

  async getProfile(userId: string) {
    const { data, error } = await this.db
      .from('public_profiles')
      .select()
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error('Failed to get profile', error);
    }

    return data;
  }

  async updateProfile(
    userId: string,
    data: UpdateProfile,
    options?: { abortSignal?: AbortSignal },
  ) {
    const query = this.db
      .from('public_profiles')
      .update(data)
      .eq('user_id', userId)
      .select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data: updatedProfile, error } = await query.single();

    if (error) {
      throw new Error('Failed to update profile', error);
    }

    return updatedProfile;
  }

  /**
   * Updates a user in the database.
   * @param user - The user data to update. All specified properties will be updated.
   * @returns The updated user.
   */
  async update(
    userId: string,
    data: UpdateUser,
    options?: { abortSignal?: AbortSignal },
  ): Promise<User> {
    const query = this.db
      .from('users')
      .update({
        default_btc_account_id: data.defaultBtcAccountId,
        default_usd_account_id: data.defaultUsdAccountId,
        default_currency: data.defaultCurrency,
      })
      .eq('id', userId)
      .select();
    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data: updatedUser, error } = await query.single();

    if (error) {
      throw new Error('Failed to update user', error);
    }

    return this.toUser(updatedUser);
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
      emailVerified: boolean;
      /**
       * Accounts to insert for the user.
       * Will be used only when the account is created. For existing users, the accounts will be ignored.
       */
      accounts: DistributedOmit<Account, 'id' | 'createdAt'>[];
      /**
       * Profile to insert for the user.
       */
      profile: {
        username: string;
      };
    },
    options?: { abortSignal?: AbortSignal },
  ): Promise<{ user: User; accounts: Account[] }> {
    const accountsToAdd = user.accounts.map((account) => ({
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
      email_verified: user.emailVerified,
      accounts: accountsToAdd,
      profile: user.profile,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to upsert user', error);
    }

    const { accounts, ...upsertedUser } = data;

    return {
      user: this.toUser(upsertedUser),
      accounts: accounts.map(AccountRepository.toAccount),
    };
  }

  async updateUsername(userId: string, username: string) {
    const { data, error } = await this.db
      .from('public_profiles')
      .update({ username })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update username', error);
    }

    return data;
  }

  private toUser(dbUser: BoardwalkDbUser): User {
    if (dbUser.email) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        emailVerified: dbUser.email_verified,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
        defaultBtcAccountId: dbUser.default_btc_account_id ?? '',
        defaultUsdAccountId: dbUser.default_usd_account_id ?? '',
        defaultCurrency: dbUser.default_currency,
        profileId: dbUser.profile_id ?? '',
        isGuest: false,
      };
    }

    return {
      id: dbUser.id,
      emailVerified: dbUser.email_verified,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      defaultBtcAccountId: dbUser.default_btc_account_id ?? '',
      defaultUsdAccountId: dbUser.default_usd_account_id ?? '',
      defaultCurrency: dbUser.default_currency,
      profileId: dbUser.profile_id ?? '',
      isGuest: true,
    };
  }
}
