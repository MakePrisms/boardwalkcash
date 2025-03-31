import type { Token } from '@cashu/cashu-ts';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { CashuAccount } from '../accounts/account';
import { useAccountsCache } from '../accounts/account-hooks';
import { useUserRef } from '../user/user-hooks';
import {
  type CashuTokenSwap,
  FailedToCompleteTokenSwapError,
} from './cashu-token-swap';
import { useCashuTokenSwapRepository } from './cashu-token-swap-repository';
import { useCashuTokenSwapService } from './cashu-token-swap-service';

type CreateProps = {
  token: Token;
  account: CashuAccount;
};

const pendingCashuTokenSwapsQueryKey = 'pending-cashu-token-swaps';

class PendingCashuTokenSwapsCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap[]>(
      [pendingCashuTokenSwapsQueryKey, tokenSwap.userId],
      (curr) => [...(curr ?? []), tokenSwap],
    );
  }

  get(userId: string, tokenHash: string) {
    return this.queryClient
      .getQueryData<CashuTokenSwap[]>([pendingCashuTokenSwapsQueryKey, userId])
      ?.find((d) => d.tokenHash === tokenHash);
  }

  remove(tokenSwap: CashuTokenSwap) {
    this.queryClient.setQueryData<CashuTokenSwap[]>(
      [pendingCashuTokenSwapsQueryKey, tokenSwap.userId],
      (curr) => curr?.filter((d) => d.tokenHash !== tokenSwap.tokenHash),
    );
  }
}

function usePendingCashuTokenSwapsCache() {
  const queryClient = useQueryClient();
  return new PendingCashuTokenSwapsCache(queryClient);
}

export function useSwapToClaimCashuToken() {
  const userRef = useUserRef();
  const tokenSwapService = useCashuTokenSwapService();
  const pendingCashuTokenSwapsCache = usePendingCashuTokenSwapsCache();

  return useMutation({
    mutationKey: ['swap-to-claim-cashu-token'],
    mutationFn: async ({ token, account }: CreateProps) => {
      return tokenSwapService.swapToClaim({
        userId: userRef.current.id,
        token,
        account,
      });
    },
    onSuccess: (data) => {
      pendingCashuTokenSwapsCache.remove(data);
    },
    onError: (error) => {
      if (error instanceof FailedToCompleteTokenSwapError) {
        const tokenSwap = pendingCashuTokenSwapsCache.get(
          userRef.current.id,
          error.tokenSwap.tokenHash,
        );
        if (!tokenSwap) {
          pendingCashuTokenSwapsCache.add(error.tokenSwap);
        }
      }
      console.error('Error claiming token', error);
    },
  });
}

function usePendingCashuTokenSwaps() {
  const userRef = useUserRef();
  const tokenSwapRepository = useCashuTokenSwapRepository();

  const { data } = useQuery({
    queryKey: [pendingCashuTokenSwapsQueryKey, userRef.current.id],
    queryFn: () => tokenSwapRepository.getPending(userRef.current.id),
    throwOnError: true,
    initialData: [],
    refetchOnWindowFocus: false,
  });

  return data;
}

export function useRecoverPendingCashuTokenSwaps() {
  const pendingSwaps = usePendingCashuTokenSwaps();
  const { mutate: swapToClaim } = useSwapToClaimCashuToken();
  const accountsCache = useAccountsCache();

  useQueries({
    queries: pendingSwaps.map((swap) => ({
      queryKey: ['recover-cashu-token-swap', swap.tokenHash],
      queryFn: () => {
        const { token, accountId } = swap;
        const account = accountsCache.get(accountId);
        if (!account || account.type !== 'cashu') {
          throw new Error(`Account not found for id: ${accountId}`);
        }
        return swapToClaim({ token, account });
      },
      refetchInterval: 30_000,
    })),
  });
}
