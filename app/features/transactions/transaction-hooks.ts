import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type BoardwalkDbTransaction,
  boardwalkDb,
} from '~/features/boardwalk-db/database';
import { useLatest } from '~/lib/use-latest';
import type { Transaction } from './transaction';
import {
  TransactionRepository,
  useTransactionRepository,
} from './transaction-repository';

export function useTransaction({
  transactionId,
  onCompleted,
  onFailed,
}: {
  transactionId?: string;
  onCompleted?: () => void;
  onFailed?: () => void;
}) {
  const enabled = !!transactionId;
  const onCompletedRef = useLatest(onCompleted);
  const onFailedRef = useLatest(onFailed);
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

  useEffect(() => {
    if (!transaction) return;

    if (transaction.state === 'COMPLETED') {
      onCompletedRef.current?.();
    } else if (transaction.state === 'FAILED') {
      onFailedRef.current?.();
    }
  }, [transaction]);

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

    const channel = boardwalkDb
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
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
