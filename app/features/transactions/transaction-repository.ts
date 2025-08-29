import type { Money } from '~/lib/money';
import {
  type AgicashDb,
  type AgicashDbTransaction,
  agicashDb,
} from '../agicash-db/database';
import { useEncryption } from '../shared/encryption';
import type {
  CashuLightningReceiveTransactionDetails,
  CashuTokenReceiveTransactionDetails,
  CashuTokenSendTransactionDetails,
  CompletedCashuLightningSendTransactionDetails,
  IncompleteCashuLightningSendTransactionDetails,
  Transaction,
} from './transaction';

type Encryption = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

type Options = {
  abortSignal?: AbortSignal;
};

export type Cursor = {
  stateSortOrder: number;
  createdAt: string;
  id: string;
} | null;

type ListOptions = Options & {
  userId: string;
  cursor?: Cursor;
  pageSize?: number;
};

type UnifiedTransactionDetails =
  | CashuTokenReceiveTransactionDetails
  | CashuTokenSendTransactionDetails
  | CashuLightningReceiveTransactionDetails
  | IncompleteCashuLightningSendTransactionDetails
  | CompletedCashuLightningSendTransactionDetails;

export class TransactionRepository {
  constructor(
    private db: AgicashDb,
    private encryption: Encryption,
  ) {}

  async get(transactionId: string, options?: Options) {
    const query = this.db.from('transactions').select().eq('id', transactionId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get transaction', { cause: error });
    }

    return this.toTransaction(data);
  }

  async list({
    userId,
    cursor = null,
    pageSize = 25,
    abortSignal,
  }: ListOptions) {
    const query = this.db.rpc('list_transactions', {
      p_user_id: userId,
      p_cursor_state_sort_order: cursor?.stateSortOrder,
      p_cursor_created_at: cursor?.createdAt,
      p_cursor_id: cursor?.id,
      p_page_size: pageSize,
    });

    if (abortSignal) {
      query.abortSignal(abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to fetch transactions', { cause: error });
    }

    const transactions = await Promise.all(
      data.map((transaction) => this.toTransaction(transaction)),
    );
    const lastTransaction = transactions[transactions.length - 1];

    return {
      transactions,
      nextCursor: lastTransaction
        ? {
            stateSortOrder: lastTransaction.state === 'PENDING' ? 2 : 1,
            createdAt: lastTransaction.createdAt,
            id: lastTransaction.id,
          }
        : null,
    };
  }

  async hasUnseenTransactions(
    {
      userId,
      transactionTypes,
      transactionStates,
      transactionDirections,
    }: {
      userId: string;
      transactionTypes: Transaction['type'][];
      transactionStates: Transaction['state'][];
      transactionDirections: Transaction['direction'][];
    },
    options?: Options,
  ) {
    const query = this.db
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false)
      .in('type', transactionTypes)
      .in('state', transactionStates)
      .in('direction', transactionDirections);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error('Failed to check for unseen transactions', {
        cause: error,
      });
    }

    return (count ?? 0) > 0;
  }

  async acknowledgeTransaction(
    {
      userId,
      transactionId,
    }: {
      userId: string;
      transactionId: string;
    },
    options?: Options,
  ) {
    const query = this.db
      .from('transactions')
      .update({ seen: true })
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to mark transaction as seen', { cause: error });
    }
  }

  async toTransaction(data: AgicashDbTransaction): Promise<Transaction> {
    const details = await this.encryption.decrypt<UnifiedTransactionDetails>(
      data.encrypted_transaction_details,
    );

    const baseTx = {
      id: data.id,
      userId: data.user_id,
      accountId: data.account_id,
      createdAt: data.created_at,
      pendingAt: data.pending_at,
      completedAt: data.completed_at,
      failedAt: data.failed_at,
      reversedTransactionId: data.reversed_transaction_id,
      reversedAt: data.reversed_at,
      seen: data.seen,
    };

    const { state, direction, type } = data;

    const createTransaction = <T extends Transaction>(
      amount: Money,
      transactionDetails: T['details'],
    ): T =>
      ({
        ...baseTx,
        direction,
        type,
        state,
        amount,
        details: transactionDetails,
      }) as T;

    // Lightning send transactions have different amounts based on completion state
    if (type === 'CASHU_LIGHTNING' && direction === 'SEND') {
      if (state === 'COMPLETED') {
        const completedDetails =
          details as CompletedCashuLightningSendTransactionDetails;
        return createTransaction(
          completedDetails.amountSpent,
          completedDetails,
        );
      }
      const incompleteDetails =
        details as IncompleteCashuLightningSendTransactionDetails;
      return createTransaction(
        incompleteDetails.amountReserved,
        incompleteDetails,
      );
    }

    if (type === 'CASHU_LIGHTNING' && direction === 'RECEIVE') {
      const receiveDetails = details as CashuLightningReceiveTransactionDetails;
      return createTransaction(receiveDetails.amountReceived, receiveDetails);
    }

    if (type === 'CASHU_TOKEN' && direction === 'SEND') {
      const sendDetails = details as CashuTokenSendTransactionDetails;
      return createTransaction(sendDetails.amountSpent, sendDetails);
    }

    if (type === 'CASHU_TOKEN' && direction === 'RECEIVE') {
      const receiveDetails = details as CashuTokenReceiveTransactionDetails;
      return createTransaction(receiveDetails.amountReceived, receiveDetails);
    }

    throw new Error('Invalid transaction data', { cause: data });
  }
}

export function useTransactionRepository() {
  const encryption = useEncryption();
  return new TransactionRepository(agicashDb, encryption);
}
