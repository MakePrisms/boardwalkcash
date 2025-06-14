import { type AgicashDb, agicashDb } from '../agicash-db/database';

type Options = {
  abortSignal?: AbortSignal;
};

export class TaskProcessingLockRepository {
  constructor(private readonly db: AgicashDb) {}

  /**
   * Attempts to take the lead for processing tasks for the given user.
   * @param userId - The id of the user to take the lead for.
   * @param clientId - The id of the client that is taking the lead.
   * @returns True if the lead was taken, false otherwise.
   */
  async takeLead(
    userId: string,
    clientId: string,
    options?: Options,
  ): Promise<boolean> {
    const query = this.db.rpc('take_lead', {
      p_user_id: userId,
      p_client_id: clientId,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Take lead request failed', {
        cause: error,
      });
    }

    return data;
  }
}

export function useTaskProcessingLockRepository() {
  return new TaskProcessingLockRepository(agicashDb);
}
