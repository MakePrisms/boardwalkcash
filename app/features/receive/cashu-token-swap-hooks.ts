import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { computeSHA256 } from '~/lib/sha256';
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

const cashuTokenSwapQueryKey = 'cashu-token-swap';
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

  get(tokenHash: string) {
    return this.queryClient
      .getQueryData<CashuTokenSwap[]>([
        pendingCashuTokenSwapsQueryKey,
        tokenHash,
      ])
      ?.find((d) => d.tokenHash === tokenHash);
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

export function usePrepareCashuTokenSwap() {
  const userRef = useUserRef();
  const queryClient = useQueryClient();
  const tokenSwapService = useCashuTokenSwapService();
  const cashuTokenSwapCache = useCashuTokenSwapCache();
  const pendingSwapsCache = useMemo(
    () => new PendingCashuTokenSwapsCache(queryClient),
    [queryClient],
  );

  return useMutation({
    mutationKey: ['create-cashu-token-swap'],
    scope: {
      id: 'create-cashu-token-swap',
    },
    mutationFn: async ({ token, account }: CreateProps) => {
      // TODO: right now we calculate the hash here and in prepareSwap.
      const tokenHash = await computeSHA256(getEncodedToken(token));

      const existingTokenSwap = pendingSwapsCache.get(tokenHash);
      if (existingTokenSwap) {
        return existingTokenSwap;
      }

      return tokenSwapService.prepareSwap({
        userId: userRef.current.id,
        token,
        account,
      });
    },
    onSuccess: (tokenSwap) => {
      console.log('Created token swap', tokenSwap);
      cashuTokenSwapCache.add(tokenSwap);
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
      swap?: undefined;
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
    initialData: [] as CashuTokenSwap[],
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

  return data;
}

function useFinalizeTokenSwap(swaps: CashuTokenSwap[]) {
  const tokenSwapService = useCashuTokenSwapService();
  const accountsCache = useAccountsCache();

  useQueries({
    queries: swaps
      .filter((swap) => swap.state === 'PENDING')
      .map((swap) => ({
        queryKey: ['finalize-cashu-token-swap', swap.id],
        queryFn: async () => {
          try {
            const account = accountsCache.get(swap.accountId);
            if (!account || account.type !== 'cashu') {
              throw new Error(`Account not found for id: ${swap.accountId}`);
            }
            console.log('Finalizing token swap', swap);
            return tokenSwapService.finalizeSwap(account, swap);
          } catch (error) {
            console.error('Error finalizing token swap', error);
            throw error;
          }
        },
        refetchInterval: 10000,
        refetchIntervalInBackground: true,
      })),
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
            console.log('Token swap created', payload.new);
            const swap = await CashuTokenSwapRepository.toTokenSwap(
              payload.new,
              cashuCryptography.decrypt,
            );
            onCreatedRef.current(swap);
          } else if (payload.eventType === 'UPDATE') {
            console.log('Token swap updated', payload.new);
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

export function useTrackCashuTokenSwaps() {
  const pendingSwaps = usePendingCashuTokenSwaps();
  useFinalizeTokenSwap(pendingSwaps);
  return pendingSwaps;
}
