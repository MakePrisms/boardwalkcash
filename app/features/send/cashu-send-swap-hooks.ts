import type { Proof, ProofState, Token } from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getCashuProtocolUnit, getCashuWallet } from '~/lib/cashu';
import type { Money } from '~/lib/money';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount } from '../accounts/account';
import { useAccountsCache } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuSendSwap,
  boardwalkDb,
} from '../boardwalk-db/database';
import { useCashuTokenSwapService } from '../receive/cashu-token-swap-service';
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

export function useSwapForProofsToSend() {
  const cashuSendSwapService = useCashuSendSwapService();
  const accountsCache = useAccountsCache();

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
      return cashuSendSwapService.swapForProofsToSend({
        swap,
        account,
      });
    },
    onError: (error) => {
      // TODO? the swap has failed, handle retiries? sotify user from useCashuSendSwap
      console.error('useSwapForProofsToSend error', {
        cause: error,
      });
    },
  });
}

export function useCancelCashuSendSwap() {
  const accountsCache = useAccountsCache();
  const cashuSendSwapService = useCashuSendSwapService();
  const cashuTokenSwapService = useCashuTokenSwapService();
  const userRef = useUserRef();

  // TODO: we should not cancel unless we know that the subscription to proof states is open
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
        console.debug('removing swap', { swap });
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
};

type UseCashuSendSwapResponse =
  | {
      status: 'LOADING';
      token?: undefined;
      swap?: undefined;
    }
  | {
      status: 'PENDING' | 'COMPLETED';
      swap: CashuSendSwap;
      token: Token;
    };

export function useCashuSendSwap({
  id,
  onPending,
  onCompleted,
}: UseCashuSendSwapProps): UseCashuSendSwapResponse {
  const enabled = !!id;
  const onPendingRef = useLatest(onPending);
  const onCompletedRef = useLatest(onCompleted);
  const cashuSendSwapCache = useCashuSendSwapCache();

  const { data } = useQuery({
    queryKey: [cashuSendSwapQueryKey, id],
    queryFn: () => cashuSendSwapCache.get(id ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });

  useEffect(() => {
    if (!data) return;

    if (data.state === 'PENDING') {
      onPendingRef.current?.(data);
    } else if (data.state === 'COMPLETED') {
      onCompletedRef.current?.(data);
    }
  }, [data]);

  if (!data || data.state === 'DRAFT') {
    return { status: 'LOADING' };
  }

  if (data.state === 'PENDING' || data.state === 'COMPLETED') {
    return {
      status: data.state,
      swap: data,
      token: {
        mint: data.mintUrl,
        proofs: data.proofsToSend,
        unit: getCashuProtocolUnit(data.currency),
      },
    };
  }

  throw new Error(`Got unexpected swap state: ${data.state}`);
}

type OnProofStateChangeProps = {
  swaps: (CashuSendSwap & { state: 'PENDING' })[];
  onSpent: (account: CashuAccount, swap: CashuSendSwap) => void;
};

function useOnProofStateChange({ swaps, onSpent }: OnProofStateChangeProps) {
  const accountsCache = useAccountsCache();
  const onSpentRef = useLatest(onSpent);

  // collect proof updates for each swap
  const proofUpdatesRef = useRef<
    Record<string, Record<string, ProofState['state']>>
  >({});

  const handleProofStateUpdate = useCallback(
    async (proofUpdate: ProofState & { proof: Proof }) => {
      const swap = swaps.find((swap) =>
        swap.proofsToSend.some((p) => p.C === proofUpdate.proof.C),
      );
      if (!swap) return;

      if (!proofUpdatesRef.current[swap.id]) {
        proofUpdatesRef.current[swap.id] = {};
      }
      proofUpdatesRef.current[swap.id][proofUpdate.proof.C] = proofUpdate.state;

      const allProofsSpent = swap.proofsToSend.every(
        (proof) => proofUpdatesRef.current[swap.id][proof.C] === 'SPENT',
      );

      if (allProofsSpent) {
        const account = await accountsCache.getLatest(swap.accountId);
        if (!account || account.type !== 'cashu') {
          throw new Error(`Account not found for id: ${swap.accountId}`);
        }

        onSpentRef.current(account, swap);
      }
    },
    [swaps, accountsCache],
  );

  useEffect(() => {
    if (swaps.length === 0) return;

    const subscribeToProofStateUpdates = async (
      swaps: OnProofStateChangeProps['swaps'],
    ) => {
      const swapsByMint = swaps.reduce<
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

      const _subscriptions = Object.entries(swapsByMint).map(
        ([mintUrl, swaps]) => {
          const wallet = getCashuWallet(mintUrl);
          const proofs = swaps.flatMap((swap) => swap.proofsToSend);

          console.debug(
            `subscribing to proof state updates for mint: ${mintUrl}`,
            proofs,
          );

          return wallet
            .onProofStateUpdates(proofs, handleProofStateUpdate, (error) =>
              console.error('Swap updates socket error', {
                cause: error,
              }),
            )
            .catch((error) => {
              console.error('Failed to open proof state updates socket', {
                cause: error,
              });
            });
        },
      );

      // const subscriptionCancellers = await Promise.all(subscriptions);

      // return () => {
      // subscriptionCancellers.forEach((cancel) => cancel());
      // };
    };

    subscribeToProofStateUpdates(swaps);
  }, [swaps, accountsCache, handleProofStateUpdate]);
}

export function useTrackUnresolvedCashuSendSwaps() {
  const { draft, pending } = useUnresolvedCashuSendSwaps();
  const { mutate: swapForProofsToSend } = useSwapForProofsToSend();
  const cashuSendSwapService = useCashuSendSwapService();

  useOnProofStateChange({
    swaps: pending,
    onSpent: (_, swap) => {
      console.debug('onSpent', { swap });
      cashuSendSwapService.complete(swap);
    },
  });

  useQueries({
    queries: draft.map((swap) => ({
      queryKey: ['complete-cashu-send-swap', swap.id],
      queryFn: async () => {
        swapForProofsToSend({ swap });
        return true;
      },
      retry: 0,
    })),
  });

  useEffect(() => {
    console.debug('unresolved swaps', { draft, pending });
  }, [draft, pending]);
}
