import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  type AgicashDbTransaction,
  agicashDb,
} from '~/features/agicash-db/database';
import { useLatest } from '~/lib/use-latest';
import { useUserRef } from '../user/user-hooks';
import type { Transaction } from './transaction';
import {
  TransactionRepository,
  useTransactionRepository,
} from './transaction-repository';
const transactionQueryKey = 'transaction';
const allTransactionsQueryKey = 'all-transactions';

class TransactionCache {
  constructor(private readonly queryClient: QueryClient) {}

  updateIfExists(transaction: Transaction) {
    this.queryClient.setQueryData<Transaction>(
      [transactionQueryKey, transaction.id],
      (curr) => (curr ? transaction : undefined),
    );
  }
}

const useTransactionCache = () => {
  const queryClient = useQueryClient();
  return useMemo(() => new TransactionCache(queryClient), [queryClient]);
};

/**
 * Hook to get a transaction by id using suspense query.
 * @param id - The transaction id
 * @returns the query data
 */
export function useTransaction(id: string) {
  const transactionRepository = useTransactionRepository();
  const transactionCache = useTransactionCache();

  useOnTransactionChange({
    transactionId: id,
    onUpdated: (updatedTransaction) => {
      transactionCache.updateIfExists(updatedTransaction);
    },
  });

  return useSuspenseQuery({
    queryKey: [transactionQueryKey, id],
    queryFn: () => transactionRepository.get(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

type UseTrackTransactionProps = {
  transactionId?: string;
  onUpdated?: (transaction: Transaction) => void;
};

type UseTrackTransactionResponse =
  | {
      status: 'DISABLED' | 'LOADING';
      transaction?: undefined;
    }
  | {
      status: Transaction['state'];
      transaction: Transaction;
    };

export function useTrackTransaction({
  transactionId,
  onUpdated,
}: UseTrackTransactionProps): UseTrackTransactionResponse {
  const enabled = !!transactionId;
  const onUpdatedRef = useLatest(onUpdated);
  const transactionCache = useTransactionCache();
  const transactionRepository = useTransactionRepository();

  const { data: transaction } = useQuery({
    queryKey: [transactionQueryKey, transactionId],
    queryFn: () => transactionRepository.get(transactionId ?? ''),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useOnTransactionChange({
    transactionId,
    onUpdated: (updatedTransaction) => {
      transactionCache.updateIfExists(updatedTransaction);
      onUpdatedRef.current?.(updatedTransaction);
    },
  });

  if (!enabled) {
    return { status: 'DISABLED' };
  }

  if (!transaction) {
    return { status: 'LOADING' };
  }

  return {
    status: transaction.state,
    transaction,
  };
}

type Cursor = {
  createdAt: string;
  id: string;
} | null;

const PAGE_SIZE = 25;

export function useTransactions() {
  const userRef = useUserRef();
  const transactionRepository = useTransactionRepository();
  const queryClient = useQueryClient();

  const result = useInfiniteQuery({
    queryKey: ['transactions', userRef.current.id],
    initialPageParam: null,
    queryFn: async ({ pageParam }: { pageParam: Cursor | null }) => {
      const result = await transactionRepository.list({
        userId: userRef.current.id,
        cursor: pageParam,
        pageSize: PAGE_SIZE,
      });
      return {
        transactions: result.transactions,
        nextCursor:
          result.transactions.length === PAGE_SIZE ? result.nextCursor : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  // Update transaction in the list when any transaction changes
  useOnAllTransactionsChange({
    onUpdated: (updatedTransaction) => {
      queryClient.setQueryData<typeof result.data>(
        [allTransactionsQueryKey],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              transactions: page.transactions.map((transaction) =>
                transaction.id === updatedTransaction.id
                  ? updatedTransaction
                  : transaction,
              ),
            })),
          };
        },
      );
    },
  });

  return result;
}

function useOnTransactionChange({
  transactionId,
  onUpdated,
}: {
  transactionId?: string;
  onUpdated: (transaction: Transaction) => void;
}) {
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    if (!transactionId) return;

    const channel = agicashDb
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'wallet',
          table: 'transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload: RealtimePostgresChangesPayload<AgicashDbTransaction>) => {
          if (payload.eventType === 'UPDATE') {
            const updatedTransaction = TransactionRepository.toTransaction(
              payload.new,
            );
            onUpdatedRef.current(updatedTransaction);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [transactionId]);
}

export function useOnAllTransactionsChange({
  onUpdated,
}: { onUpdated: (transaction: Transaction) => void }) {
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    const channel = agicashDb
      .channel('all-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'transactions',
        },
        (payload: RealtimePostgresChangesPayload<AgicashDbTransaction>) => {
          if (payload.eventType === 'UPDATE') {
            const updatedTransaction = TransactionRepository.toTransaction(
              payload.new,
            );
            onUpdatedRef.current(updatedTransaction);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);
}
