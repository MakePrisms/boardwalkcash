import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type BoardwalkDbTransaction,
  boardwalkDb,
} from '~/features/boardwalk-db/database';
import { useLatest } from '~/lib/use-latest';
import { useUserRef } from '../user/user-hooks';
import type { Transaction } from './transaction';
import {
  TransactionRepository,
  useTransactionRepository,
} from './transaction-repository';

/**
 * Hook to get a transaction by id and listen for updates.
 * @returns the transaction or undefined if no transaction id is provided or the transaction is being fetched
 */
export function useTransaction({
  transactionId,
}: {
  transactionId?: string;
}) {
  const enabled = !!transactionId;
  const queryClient = useQueryClient();
  const transactionRepository = useTransactionRepository();

  const { data: transaction } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionRepository.get(transactionId ?? ''),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useOnTransactionChange({
    transactionId,
    onUpdated: (transaction) => {
      queryClient.setQueryData<Transaction>(
        ['transaction', transactionId],
        transaction,
      );
    },
  });

  return transaction;
}

type Cursor = {
  createdAt: string;
  id: string;
} | null;

const PAGE_SIZE = 25;

export function useTransactions() {
  const userRef = useUserRef();
  const transactionRepository = useTransactionRepository();

  return useInfiniteQuery({
    queryKey: ['transactions'],
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

    const channel = boardwalkDb
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'wallet',
          table: 'transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload: RealtimePostgresChangesPayload<BoardwalkDbTransaction>) => {
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
