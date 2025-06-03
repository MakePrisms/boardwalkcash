import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type AgicashDbTransaction,
  agicashDb,
} from '~/features/agicash-db/database';
import { useLatest } from '~/lib/use-latest';
import { useUserRef } from '../user/user-hooks';
import type { Transaction } from './transaction';
import {
  type Cursor,
  TransactionRepository,
  useTransactionRepository,
} from './transaction-repository';

const transactionQueryKey = 'transaction';
const allTransactionsQueryKey = 'all-transactions';

export function useTransaction({
  transactionId,
}: {
  transactionId?: string;
}) {
  const enabled = !!transactionId;
  const transactionRepository = useTransactionRepository();

  const { data: transaction } = useQuery({
    queryKey: [transactionQueryKey, transactionId],
    queryFn: () => transactionRepository.get(transactionId ?? ''),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return transaction;
}

export function useSuspenseTransaction(id: string) {
  const transactionRepository = useTransactionRepository();

  return useSuspenseQuery({
    queryKey: [transactionQueryKey, id],
    queryFn: () => transactionRepository.get(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

const PAGE_SIZE = 25;

export function useTransactions() {
  const userRef = useUserRef();
  const transactionRepository = useTransactionRepository();

  const result = useInfiniteQuery({
    queryKey: [allTransactionsQueryKey, userRef.current.id],
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

  return result;
}

export function useOnTransactionChange({
  onUpdated,
}: {
  onUpdated: (transaction: Transaction) => void;
}) {
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    const channel = agicashDb
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
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

export function useTrackTransactions() {
  const queryClient = useQueryClient();

  useOnTransactionChange({
    onUpdated: (updatedTransaction) => {
      // update the transaction in the query cache if it exists
      // the tx will exist if a hook that queries for transactionQueryKey is active
      queryClient.setQueryData<Transaction>(
        [transactionQueryKey, updatedTransaction.id],
        (curr) => (curr ? updatedTransaction : undefined),
      );
    },
  });
}
