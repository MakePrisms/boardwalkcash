import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { getCashuProtocolUnit } from '~/lib/cashu';
import type { Money } from '~/lib/money';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount } from '../accounts/account';
import { useAccountsCache } from '../accounts/account-hooks';
import { type AgicashDbCashuSendSwap, agicashDb } from '../agicash-db/database';
import { useCashuTokenSwapService } from '../receive/cashu-token-swap-service';
import { useCashuCryptography } from '../shared/cashu';
import { getErrorMessage } from '../shared/error';
import { useUserRef } from '../user/user-hooks';
import type { CashuSendSwap } from './cashu-send-swap';
import {
  CashuSendSwapRepository,
  useCashuSendSwapRepository,
} from './cashu-send-swap-repository';
import { useCashuSendSwapService } from './cashu-send-swap-service';
import { ProofStateSubscriptionManager } from './proof-state-subscription-manager';

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

export function useGetCashuSendSwapQuote() {
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
      return cashuSendSwapService.getQuote({
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

export function useSwapForProofsToSend() {
  const cashuSendSwapService = useCashuSendSwapService();
  const accountsCache = useAccountsCache();

  return useMutation({
    mutationKey: ['send-swap-for-proofs-to-send'],
    scope: {
      id: 'send-swap-for-proofs-to-send',
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
      await cashuSendSwapService.swapForProofsToSend({
        swap,
        account,
      });
    },
    onError: (error, { swap }) => {
      if (
        error instanceof Error &&
        error.message.includes('TOKEN_ALREADY_CLAIMED')
      ) {
        cashuSendSwapService.fail(swap, getErrorMessage(error));
      } else {
        throw error;
      }
    },
    retry: 1,
  });
}

export function useCancelCashuSendSwap() {
  const accountsCache = useAccountsCache();
  const cashuSendSwapService = useCashuSendSwapService();
  const cashuTokenSwapService = useCashuTokenSwapService();
  const userRef = useUserRef();

  return useMutation({
    mutationFn: async ({ swap }: { swap: CashuSendSwap }) => {
      const account = await accountsCache.getLatest(swap.accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error('Account not found');
      }
      if (swap.state !== 'PENDING') {
        throw new Error('Swap is not PENDING');
      }

      await cashuTokenSwapService.create({
        account,
        userId: userRef.current.id,
        token: {
          mint: account.mintUrl,
          proofs: swap.proofsToSend,
          unit: getCashuProtocolUnit(swap.currency),
        },
        type: 'CANCEL_CASHU_SEND_SWAP',
      });

      return swap;
    },
    onError: (error, { swap }) => {
      if (
        error instanceof Error &&
        error.message.includes('This token has already been claimed')
      ) {
        cashuSendSwapService.complete(swap);
      } else {
        throw error;
      }
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
    const channel = agicashDb
      .channel('cashu-send-swaps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'wallet', table: 'cashu_send_swaps' },
        async (
          payload: RealtimePostgresChangesPayload<AgicashDbCashuSendSwap>,
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
            ).catch((e) => {
              console.error('Failed to update cashu send swap', {
                cause: e,
                payload,
              });
              throw e;
            });
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

export function useUnresolvedCashuSendSwaps() {
  const cashuSendSwapRepository = useCashuSendSwapRepository();
  const userRef = useUserRef();
  const cashuSendSwapCache = useCashuSendSwapCache();
  const queryClient = useQueryClient();
  const unresolvedSwapsCache = useMemo(
    () => new UnresolvedCashuSendSwapsCache(queryClient),
    [queryClient],
  );

  const { data } = useSuspenseQuery({
    queryKey: [unresolvedCashuSendSwapsQueryKey, userRef.current.id],
    queryFn: () => cashuSendSwapRepository.getUnresolved(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
  });

  useOnCashuSendSwapChange({
    onCreated: (swap) => {
      unresolvedSwapsCache.add(swap);
    },
    onUpdated: (swap) => {
      cashuSendSwapCache.updateIfExists(swap);

      if (['DRAFT', 'PENDING'].includes(swap.state)) {
        unresolvedSwapsCache.update(swap);
      } else {
        unresolvedSwapsCache.remove(swap);
      }
    },
  });

  // TODO: figure out why we have to cast here. I think something to do with the state and it being an array.
  // The same problem for Extract<CashuSendSwap, { state: 'DRAFT' }>[] which makes the type `never[]`
  return {
    draft: data.filter((swap) => swap.state === 'DRAFT') as (CashuSendSwap & {
      state: 'DRAFT';
    })[],
    pending: data.filter(
      (swap) => swap.state === 'PENDING',
    ) as (CashuSendSwap & { state: 'PENDING' })[],
  };
}

type UseCashuSendSwapProps = {
  id?: string;
  onPending?: (swap: CashuSendSwap) => void;
  onCompleted?: (swap: CashuSendSwap) => void;
  onFailed?: (swap: CashuSendSwap & { state: 'FAILED' }) => void;
};

type UseCashuSendSwapResponse =
  | {
      status: 'LOADING';
      token?: undefined;
      swap?: undefined;
    }
  | {
      status: CashuSendSwap['state'];
      swap: CashuSendSwap;
    };

export function useCashuSendSwap({
  id,
  onPending,
  onCompleted,
  onFailed,
}: UseCashuSendSwapProps): UseCashuSendSwapResponse {
  const enabled = !!id;
  const onPendingRef = useLatest(onPending);
  const onCompletedRef = useLatest(onCompleted);
  const onFailedRef = useLatest(onFailed);
  const cashuSendSwapCache = useCashuSendSwapCache();
  const cashuSendSwapRepository = useCashuSendSwapRepository();

  const { data } = useQuery({
    queryKey: [cashuSendSwapQueryKey, id],
    queryFn: () =>
      cashuSendSwapCache.get(id ?? '') ?? cashuSendSwapRepository.get(id ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });

  useEffect(() => {
    if (!data) return;

    if (data.state === 'PENDING') {
      onPendingRef.current?.(data);
    } else if (data.state === 'COMPLETED') {
      onCompletedRef.current?.(data);
    } else if (data.state === 'FAILED') {
      onFailedRef.current?.(data);
    }
  }, [data]);

  if (!data || data.state === 'DRAFT') {
    return { status: 'LOADING' };
  }

  if (
    data.state === 'PENDING' ||
    data.state === 'COMPLETED' ||
    data.state === 'CANCELLED' ||
    data.state === 'FAILED'
  ) {
    return {
      status: data.state,
      swap: data,
    };
  }

  throw new Error(`Got unexpected swap state: ${data.state}`);
}

type OnProofStateChangeProps = {
  swaps: (CashuSendSwap & { state: 'PENDING' })[];
  onSpent: (account: CashuAccount, swap: CashuSendSwap) => void;
};

function useOnProofStateChange({ swaps, onSpent }: OnProofStateChangeProps) {
  const [subscriptionManager] = useState(
    () => new ProofStateSubscriptionManager(),
  );
  const accountsCache = useAccountsCache();
  const onSpentRef = useLatest(onSpent);
  const swapsRef = useLatest(swaps);

  const handleSpent = (spentSwap: CashuSendSwap) => {
    const account = accountsCache.get(spentSwap.accountId);
    if (!account || account.type !== 'cashu') {
      throw new Error(`Cashu account not found for id: ${spentSwap.accountId}`);
    }
    onSpentRef.current(account, spentSwap);
  };

  const { mutate: subscribe } = useMutation({
    mutationFn: (props: {
      mintUrl: string;
      swaps: (CashuSendSwap & { state: 'PENDING' })[];
    }) =>
      subscriptionManager.subscribe({
        ...props,
        onSpent: handleSpent,
      }),
    retry: 5,
    onError: (error, variables) => {
      console.error('Failed to subscribe to proof state updates', {
        cause: error,
        mintUrl: variables.mintUrl,
      });
    },
  });

  useEffect(() => {
    const swapsByMint = swapsRef.current.reduce<
      Record<string, OnProofStateChangeProps['swaps']>
    >((acc, swap) => {
      const account = accountsCache.get(swap.accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error(`Cashu account not found for id: ${swap.accountId}`);
      }
      const existing = acc[account.mintUrl] ?? [];
      acc[account.mintUrl] = existing.concat(swap);
      return acc;
    }, {});

    Object.entries(swapsByMint).forEach(([mintUrl, swaps]) => {
      subscribe({ mintUrl, swaps });
    });
  }, [subscribe, accountsCache]);
}

export function useTrackUnresolvedCashuSendSwaps() {
  const { draft, pending } = useUnresolvedCashuSendSwaps();
  const { mutate: swapForProofsToSend } = useSwapForProofsToSend();
  const cashuSendSwapService = useCashuSendSwapService();

  console.log('pending', pending);

  useOnProofStateChange({
    swaps: pending,
    onSpent: (_, swap) => {
      cashuSendSwapService.complete(swap);
    },
  });

  useQueries({
    queries: draft.map((swap) => ({
      queryKey: ['send-swap-for-proofs-to-send', swap.id],
      queryFn: async () => {
        swapForProofsToSend({ swap });
        return true;
      },
      retry: 0,
    })),
  });
}
