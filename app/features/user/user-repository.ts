import type { BoardwalkDb, BoardwalkDbUser } from '../boardwalk-db/database';

export class UserRepository {
  constructor(private readonly db: BoardwalkDb) {}

  /**
   * Inserts a user into the database. If the user already exists, it updates the user.
   * @param user - The user to upsert.
   * @returns The upserted user.
   */
  async upsert(
    user: Omit<BoardwalkDbUser, 'email' | 'created_at' | 'updated_at'> & {
      email?: string | null | undefined;
    },
    options: {
      abortSignal?: AbortSignal;
    } = {},
  ): Promise<BoardwalkDbUser> {
    const query = this.db
      .from('users')
      .upsert({
        id: user.id,
        email: user.email ?? null,
        email_verified: user.email_verified,
      })
      .select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to upsert user', error);
    }

    return data;
  }
}
