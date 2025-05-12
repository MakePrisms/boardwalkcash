import { Money } from '~/lib/money';
import {
  type BoardwalkDb,
  type BoardwalkDbTransaction,
  boardwalkDb,
} from '../boardwalk-db/database';
import type { Transaction } from './transaction';

type Options = {
  abortSignal?: AbortSignal;
};

type Cursor = {
  createdAt: string;
  id: string;
} | null;

type ListOptions = Options & {
  userId: string;
  cursor?: Cursor;
  pageSize?: number;
};

export class TransactionRepository {
  constructor(private db: BoardwalkDb) {}

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

  async list({
    userId,
    cursor = null,
    pageSize = 25,
    abortSignal,
  }: ListOptions) {
    let query = this.db
      .from('transactions')
      .select()
      .eq('user_id', userId)
      .in('state', ['PENDING', 'COMPLETED'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize);

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    if (abortSignal) {
      query = query.abortSignal(abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to list transactions', { cause: error });
    }

    const transactions = data.map(TransactionRepository.toTransaction);
    const lastTransaction = transactions[transactions.length - 1];

    return {
      transactions,
      nextCursor: lastTransaction
        ? {
            createdAt: lastTransaction.createdAt,
            id: lastTransaction.id,
          }
        : null,
    };
  }

  static toTransaction(data: BoardwalkDbTransaction): Transaction {
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
      createdAt: data.created_at,
      pendingAt: data.pending_at,
      completedAt: data.completed_at,
      failedAt: data.failed_at,
    };
  }
}

export function useTransactionRepository() {
  return new TransactionRepository(boardwalkDb);
}
