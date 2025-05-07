import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { Money } from '~/lib/money';
import { useLatest } from '~/lib/use-latest';
import { useAccountsCache } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuSendSwap,
  boardwalkDb,
} from '../boardwalk-db/database';
import { useCashuCryptography } from '../shared/cashu';
import { useUserRef } from '../user/user-hooks';
import type { CashuSendSwap } from './cashu-send-swap';
import {
  CashuSendSwapRepository,
  useCashuSendSwapRepository,
} from './cashu-send-swap-repository';
import { useCashuSendSwapService } from './cashu-send-swap-service';

// Query that tracks the "active" cashu send swap. Active one is the one that user created in current browser session.
// We want to track active send swap even after it is completed or expired which is why we can't use unresolved send swaps query.
// Unresolved send swaps query is used for active unresolved swaps plus "background" unresolved swaps. "Background" swaps are send swaps
// that were created in previous browser sessions.
const cashuSendSwapQueryKey = 'cashu-send-swap';
// Query that tracks all unresolved cashu send swaps (active and background ones).
const unresolvedCashuSendSwapsQueryKey = 'unresolved-cashu-send-swaps';

class CashuSendSwapCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(swap: CashuSendSwap) {
    this.queryClient.setQueryData<CashuSendSwap>(
      [cashuSendSwapQueryKey, swap.id],
      swap,
    );
  }

  get(swapId: string) {
    return this.queryClient.getQueryData<CashuSendSwap>([
      cashuSendSwapQueryKey,
      swapId,
    ]);
  }

  updateIfExists(swap: CashuSendSwap) {
    this.queryClient.setQueryData<CashuSendSwap>(
      [cashuSendSwapQueryKey, swap.id],
      (curr) => (curr ? swap : undefined),
    );
  }
}

class UnresolvedCashuSendSwapsCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(swap: CashuSendSwap) {
    this.queryClient.setQueryData<CashuSendSwap[]>(
      [unresolvedCashuSendSwapsQueryKey, swap.userId],
      (curr) => [...(curr ?? []), swap],
    );
  }

  update(swap: CashuSendSwap) {
    this.queryClient.setQueryData<CashuSendSwap[]>(
      [unresolvedCashuSendSwapsQueryKey, swap.userId],
      (curr) => curr?.map((d) => (d.id === swap.id ? swap : d)),
    );
  }

  remove(swap: CashuSendSwap) {
    this.queryClient.setQueryData<CashuSendSwap[]>(
      [unresolvedCashuSendSwapsQueryKey, swap.userId],
      (curr) => curr?.filter((d) => d.id !== swap.id),
    );
  }
}

function useCashuSendSwapCache() {
  const queryClient = useQueryClient();
  return useMemo(() => new CashuSendSwapCache(queryClient), [queryClient]);
}

export function useEstimateCashuSendSwapFee() {
  const cashuSendSwapService = useCashuSendSwapService();
  const accountsCache = useAccountsCache();

  return useMutation({
    mutationFn: async ({
      amount,
      accountId,
      senderPaysFee = true,
    }: {
      amount: Money;
      accountId: string;
      senderPaysFee?: boolean;
    }) => {
      const account = await accountsCache.getLatest(accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error('Account not found');
      }
      return cashuSendSwapService.estimateFee({
        amount,
        account,
        senderPaysFee,
      });
    },
  });
}

export function useCreateCashuSendSwap({
  onError,
}: { onError: (error: Error) => void }) {
  const cashuSendSwapService = useCashuSendSwapService();
  const userRef = useUserRef();
  const accountsCache = useAccountsCache();
  const cashuSendSwapCache = useCashuSendSwapCache();
  return useMutation({
    mutationFn: async ({
      amount,
      accountId,
      senderPaysFee = true,
    }: {
      amount: Money;
      accountId: string;
      senderPaysFee?: boolean;
    }) => {
      const account = await accountsCache.getLatest(accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error('Account not found');
      }
      return cashuSendSwapService.create({
        userId: userRef.current.id,
        amount,
        account,
        senderPaysFee,
      });
    },
    onSuccess: (swap) => {
      cashuSendSwapCache.add(swap);
    },
    onError: onError,
  });
}

export function useCompleteCashuSendSwap() {
  const cashuSendSwapService = useCashuSendSwapService();
  const accountsCache = useAccountsCache();
  const cashuSendSwapCache = useCashuSendSwapCache();
  return useMutation({
    mutationKey: ['complete-cashu-send-swap'],
    scope: {
      id: 'complete-cashu-send-swap',
    },
    mutationFn: async ({
      swap,
    }: {
      swap: CashuSendSwap;
    }) => {
      const account = await accountsCache.getLatest(swap.accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error('Account not found');
      }
      return cashuSendSwapService.completeSwap({
        swap,
        account,
      });
    },
    onSuccess: (swap) => {
      cashuSendSwapCache.updateIfExists(swap);
    },
  });
}

function useOnCashuSendSwapChange({
  onCreated,
  onUpdated,
}: {
  onCreated: (swap: CashuSendSwap) => void;
  onUpdated: (swap: CashuSendSwap) => void;
}) {
  const encryption = useCashuCryptography();
  const onCreatedRef = useLatest(onCreated);
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    const channel = boardwalkDb
      .channel('cashu-send-swaps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'wallet', table: 'cashu_send_swaps' },
        async (
          payload: RealtimePostgresChangesPayload<BoardwalkDbCashuSendSwap>,
        ) => {
          if (payload.eventType === 'INSERT') {
            const addedSwap = await CashuSendSwapRepository.toSwap(
              payload.new,
              encryption.decrypt,
            );
            onCreatedRef.current(addedSwap);
          } else if (payload.eventType === 'UPDATE') {
            const updatedSwap = await CashuSendSwapRepository.toSwap(
              payload.new,
              encryption.decrypt,
            );
            onUpdatedRef.current(updatedSwap);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [encryption]);
}

function useUnresolvedCashuSendSwaps() {
  const cashuSendSwapRepository = useCashuSendSwapRepository();
  const userRef = useUserRef();
  const cashuSendSwapCache = useCashuSendSwapCache();
  const queryClient = useQueryClient();
  const unresolvedSwapsCache = useMemo(
    () => new UnresolvedCashuSendSwapsCache(queryClient),
    [queryClient],
  );

  const { data } = useQuery({
    queryKey: [unresolvedCashuSendSwapsQueryKey, userRef.current.id],
    queryFn: () => cashuSendSwapRepository.getUnresolved(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
    throwOnError: true,
  });

  useOnCashuSendSwapChange({
    onCreated: (swap) => {
      unresolvedSwapsCache.add(swap);
    },
    onUpdated: (swap) => {
      cashuSendSwapCache.updateIfExists(swap);

      if (['SWAPPING', 'READY'].includes(swap.state)) {
        unresolvedSwapsCache.update(swap);
      } else {
        unresolvedSwapsCache.remove(swap);
      }
    },
  });

  return data ?? [];
}

type UseCashuSendSwapProps = {
  id?: string;
  onReady?: (swap: CashuSendSwap) => void;
  onSwapping?: (swap: CashuSendSwap) => void;
};

type UseCashuSendSwapResponse =
  | {
      status: 'LOADING';
    }
  | {
      status: CashuSendSwap['state'];
      swap: CashuSendSwap;
    };

export function useCashuSendSwap({
  id,
  onReady,
  onSwapping,
}: UseCashuSendSwapProps): UseCashuSendSwapResponse {
  const enabled = !!id;
  const onReadyRef = useLatest(onReady);
  const onSwappingRef = useLatest(onSwapping);
  const cashuSendSwapCache = useCashuSendSwapCache();

  const { data } = useQuery({
    queryKey: [cashuSendSwapQueryKey, id],
    queryFn: () => cashuSendSwapCache.get(id ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });

  useEffect(() => {
    if (!data) return;

    if (data.state === 'READY') {
      onReadyRef.current?.(data);
    } else if (data.state === 'SWAPPING') {
      onSwappingRef.current?.(data);
    }
  }, [data]);

  if (!data) {
    return { status: 'LOADING' };
  }

  return {
    status: data.state,
    swap: data,
  };
}

export function useTrackUnresolvedCashuSendSwaps() {
  const unresolvedCashuSendSwaps = useUnresolvedCashuSendSwaps();
  const { mutate: completeSwap } = useCompleteCashuSendSwap();

  console.log('unresolvedCashuSendSwaps', unresolvedCashuSendSwaps);
  console.log(
    'SWAPPING',
    unresolvedCashuSendSwaps.filter((swap) => swap.state === 'SWAPPING'),
  );

  useQueries({
    queries: unresolvedCashuSendSwaps.map((swap) => ({
      queryKey: ['complete-cashu-send-swap', swap.id],
      queryFn: async () => {
        if (swap.state === 'SWAPPING') {
          completeSwap({ swap });
        }
        return true;
      },
      retry: 0,
      staleTime: Number.POSITIVE_INFINITY,
    })),
  });
}
