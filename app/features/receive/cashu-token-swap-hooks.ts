import type { Token } from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount } from '../accounts/account';
import { useAccountsCache } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuTokenSwap,
  boardwalkDb,
} from '../boardwalk-db/database';
import { useCashuCryptography } from '../shared/cashu';
import { useUserRef } from '../user/user-hooks';
import type { CashuTokenSwap } from './cashu-token-swap';
import {
  CashuTokenSwapRepository,
  useCashuTokenSwapRepository,
} from './cashu-token-swap-repository';
import { useCashuTokenSwapService } from './cashu-token-swap-service';

type CreateProps = {
  token: Token;
  account: CashuAccount;
};

// Query to track the active token swap for a given token hash. The active swap is the one that user created in current browser session, and we track it in order to show the current state of the swap on the receive page.
const cashuTokenSwapQueryKey = 'cashu-token-swap';
// Query to track all pending token swaps for a given user (active and ones where recovery is being attempted).
const pendingCashuTokenSwapsQueryKey = 'pending-cashu-token-swaps';

class CashuTokenSwapCache {
  constructor(private readonly queryClient: QueryClient) {}

  get(tokenHash: string) {
    return this.queryClient.getQueryData<CashuTokenSwap>([
      cashuTokenSwapQueryKey,
      tokenHash,
    ]);
  }

  add(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap>(
      [cashuTokenSwapQueryKey, tokenSwap.tokenHash],
      tokenSwap,
    );
  }

  updateIfExists(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap>(
      [cashuTokenSwapQueryKey, tokenSwap.tokenHash],
      (curr) => (curr ? tokenSwap : undefined),
    );
  }
}

class PendingCashuTokenSwapsCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap[]>(
      [pendingCashuTokenSwapsQueryKey, tokenSwap.userId],
      (curr) => [...(curr ?? []), tokenSwap],
    );
  }

  update(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap[]>(
      [pendingCashuTokenSwapsQueryKey, tokenSwap.userId],
      (curr) =>
        curr?.map((d) => (d.tokenHash === tokenSwap.tokenHash ? tokenSwap : d)),
    );
  }

  remove(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap[]>(
      [pendingCashuTokenSwapsQueryKey, tokenSwap.userId],
      (curr) => curr?.filter((d) => d.tokenHash !== tokenSwap.tokenHash),
    );
  }
}

export function useCashuTokenSwapCache() {
  const queryClient = useQueryClient();
  return useMemo(() => new CashuTokenSwapCache(queryClient), [queryClient]);
}

export function useCreateCashuTokenSwap() {
  const userRef = useUserRef();
  const tokenSwapService = useCashuTokenSwapService();
  const tokenSwapCache = useCashuTokenSwapCache();

  return useMutation({
    mutationKey: ['create-cashu-token-swap'],
    scope: {
      id: 'create-cashu-token-swap',
    },
    mutationFn: async ({ token, account }: CreateProps) => {
      console.log('triggering create swap for receiving account: ', account);
      return tokenSwapService.create({
        userId: userRef.current.id,
        token,
        account,
      });
    },
    onSuccess: async (data) => {
      tokenSwapCache.add(data);
    },
  });
}

type UseTokenSwapProps = {
  tokenHash?: string;
  onCompleted?: (swap: CashuTokenSwap) => void;
  onFailed?: (swap: CashuTokenSwap) => void;
};

type UseTokenSwapResponse =
  | {
      status: 'LOADING';
    }
  | {
      status: CashuTokenSwap['state'];
      swap: CashuTokenSwap;
    };

export function useTokenSwap({
  tokenHash,
  onCompleted,
  onFailed,
}: UseTokenSwapProps): UseTokenSwapResponse {
  const enabled = !!tokenHash;
  const onCompletedRef = useLatest(onCompleted);
  const onFailedRef = useLatest(onFailed);
  const cache = useCashuTokenSwapCache();

  const { data } = useQuery({
    queryKey: [cashuTokenSwapQueryKey, tokenHash],
    queryFn: () => cache.get(tokenHash ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });

  useEffect(() => {
    if (!data) return;

    if (data.state === 'COMPLETED') {
      onCompletedRef.current?.(data);
    } else if (data.state === 'FAILED') {
      onFailedRef.current?.(data);
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

function useCompleteCashuTokenSwap() {
  const tokenSwapService = useCashuTokenSwapService();
  const accountsCache = useAccountsCache();

  return useMutation({
    mutationKey: ['complete-cashu-token-swap'],
    scope: {
      id: 'complete-cashu-token-swap',
    },
    mutationFn: async (swap: CashuTokenSwap) => {
      try {
        const account = await accountsCache.getLatest(swap.accountId);
        if (!account || account.type !== 'cashu') {
          throw new Error(`Cashu account not found for id: ${swap.accountId}`);
        }
        await tokenSwapService.completeSwap(account, swap);
      } catch (error) {
        console.error('Error finalizing token swap', error);
        throw error;
      }
    },
    retry: 1,
  });
}

function useOnCashuTokenSwapChange({
  onCreated,
  onUpdated,
}: {
  onCreated: (swap: CashuTokenSwap) => void;
  onUpdated: (swap: CashuTokenSwap) => void;
}) {
  const cashuCryptography = useCashuCryptography();
  const onCreatedRef = useLatest(onCreated);
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    const channel = boardwalkDb
      .channel('cashu-token-swaps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'cashu_token_swaps',
        },
        async (
          payload: RealtimePostgresChangesPayload<BoardwalkDbCashuTokenSwap>,
        ) => {
          if (payload.eventType === 'INSERT') {
            const swap = await CashuTokenSwapRepository.toTokenSwap(
              payload.new,
              cashuCryptography.decrypt,
            );
            onCreatedRef.current(swap);
          } else if (payload.eventType === 'UPDATE') {
            const swap = await CashuTokenSwapRepository.toTokenSwap(
              payload.new,
              cashuCryptography.decrypt,
            );
            onUpdatedRef.current(swap);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [cashuCryptography]);
}

function usePendingCashuTokenSwaps() {
  const userRef = useUserRef();
  const tokenSwapRepository = useCashuTokenSwapRepository();
  const queryClient = useQueryClient();
  const pendingSwapsCache = useMemo(
    () => new PendingCashuTokenSwapsCache(queryClient),
    [queryClient],
  );
  const tokenSwapCache = useCashuTokenSwapCache();

  const { data } = useQuery({
    queryKey: [pendingCashuTokenSwapsQueryKey, userRef.current.id],
    queryFn: () => tokenSwapRepository.getPending(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
    throwOnError: true,
  });

  useOnCashuTokenSwapChange({
    onCreated: (swap) => {
      pendingSwapsCache.add(swap);
    },
    onUpdated: (swap) => {
      tokenSwapCache.updateIfExists(swap);

      const isSwapStillPending = swap.state === 'PENDING';
      if (isSwapStillPending) {
        pendingSwapsCache.update(swap);
      } else {
        pendingSwapsCache.remove(swap);
      }
    },
  });

  return data ?? [];
}

export function useTrackPendingCashuTokenSwaps() {
  const pendingSwaps = usePendingCashuTokenSwaps();
  const { mutateAsync: completeSwap } = useCompleteCashuTokenSwap();

  useQueries({
    queries: pendingSwaps.map((swap) => ({
      queryKey: ['complete-cashu-token-swap', swap.tokenHash],
      queryFn: async () => {
        await completeSwap(swap);
        return true;
      },
      refetchInterval: 10_000,
      refetchIntervalInBackground: true,
      gcTime: 0,
      staleTime: 0,
    })),
  });
}
