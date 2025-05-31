import { Money } from '~/lib/money';
import {
  type AgicashDb,
  type AgicashDbTransaction,
  agicashDb,
} from '../agicash-db/database';
import type { Transaction } from './transaction';

type Options = {
  abortSignal?: AbortSignal;
};

export class TransactionRepository {
  constructor(private db: AgicashDb) {}

  async get(transactionId: string, options?: Options) {
    const query = this.db.from('transactions').select().eq('id', transactionId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get transaction', { cause: error });
    }

    return TransactionRepository.toTransaction(data);
  }

  static toTransaction(data: AgicashDbTransaction): Transaction {
    return {
      id: data.id,
      userId: data.user_id,
      direction: data.direction,
      type: data.type,
      state: data.state,
      accountId: data.account_id,
      amount: new Money({
        amount: data.amount,
        currency: data.currency,
      }),
      reversedTransactionId: data.reversed_transaction_id,
      createdAt: data.created_at,
      pendingAt: data.pending_at,
      completedAt: data.completed_at,
      failedAt: data.failed_at,
      reversedAt: data.reversed_at,
    };
  }
}

export function useTransactionRepository() {
  return new TransactionRepository(agicashDb);
}
