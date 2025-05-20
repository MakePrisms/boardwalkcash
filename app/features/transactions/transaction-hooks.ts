import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type AgicashDbTransaction,
  agicashDb,
} from '~/features/agicash-db/database';
import { useLatest } from '~/lib/use-latest';
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
