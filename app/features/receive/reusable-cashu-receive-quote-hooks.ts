import type { OnchainMintQuoteResponse } from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getCashuUnit, getCashuWallet } from '~/lib/cashu';
import { Money } from '~/lib/money';
import { useSupabaseRealtimeSubscription } from '~/lib/supabase/supabase-realtime';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount } from '../accounts/account';
import { useGetLatestCashuAccount } from '../accounts/account-hooks';
import {
  type AgicashDbReusableCashuReceiveQuote,
  agicashDb,
} from '../agicash-db/database';
import { BASE_CASHU_LOCKING_DERIVATION_PATH } from '../shared/cashu';
import { derivePublicKey } from '../shared/cryptography';
import { useUser } from '../user/user-hooks';
import { useCreateCashuReceiveQuote } from './cashu-receive-quote-hooks';
import type { ReusableCashuReceiveQuote } from './reusable-cashu-receive-quote';
import {
  ReusableCashuReceiveQuoteRepository,
  useReusableCashuReceiveQuoteRepository,
} from './reusable-cashu-receive-quote-repository';
import {
  type ReusableCashuReceiveOnchainQuote,
  useReusableCashuReceiveQuoteService,
} from './reusable-cashu-receive-quote-service';

type CreateReusableOnchainQuoteProps = {
  account: CashuAccount;
};

// Query keys for reusable quotes
const reusableReceiveQuoteQueryKey = 'reusable-cashu-receive-quote';
const activeReusableReceiveQuotesQueryKey =
  'active-reusable-cashu-receive-quotes';

/**
 * Cache for individual reusable receive quotes.
 */
class ReusableReceiveQuoteCache {
  constructor(private readonly queryClient: QueryClient) {}

  get(quoteId: string) {
    return this.queryClient.getQueryData<ReusableCashuReceiveQuote>([
      reusableReceiveQuoteQueryKey,
      quoteId,
    ]);
  }

  add(quote: ReusableCashuReceiveQuote) {
    this.queryClient.setQueryData<ReusableCashuReceiveQuote>(
      [reusableReceiveQuoteQueryKey, quote.id],
      quote,
    );
  }

  updateIfExists(quote: ReusableCashuReceiveQuote) {
    this.queryClient.setQueryData<ReusableCashuReceiveQuote>(
      [reusableReceiveQuoteQueryKey, quote.id],
      (curr) => (curr ? quote : undefined),
    );
  }
}

/**
 * Cache for active reusable receive quotes (those that can still receive payments).
 */
class ActiveReusableReceiveQuotesCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(quote: ReusableCashuReceiveQuote) {
    this.queryClient.setQueryData<ReusableCashuReceiveQuote[]>(
      [activeReusableReceiveQuotesQueryKey],
      (curr) => [...(curr ?? []), quote],
    );
  }

  update(quote: ReusableCashuReceiveQuote) {
    this.queryClient.setQueryData<ReusableCashuReceiveQuote[]>(
      [activeReusableReceiveQuotesQueryKey],
      (curr) => curr?.map((q) => (q.id === quote.id ? quote : q)),
    );
  }

  remove(quote: ReusableCashuReceiveQuote) {
    this.queryClient.setQueryData<ReusableCashuReceiveQuote[]>(
      [activeReusableReceiveQuotesQueryKey],
      (curr) => curr?.filter((q) => q.id !== quote.id),
    );
  }

  getByMintQuoteId(mintQuoteId: string) {
    const quotes = this.queryClient.getQueryData<ReusableCashuReceiveQuote[]>([
      activeReusableReceiveQuotesQueryKey,
    ]);
    return quotes?.find((q) => q.quoteId === mintQuoteId);
  }
}

/**
 * Hook to get the reusable receive quote cache.
 */
function useReusableReceiveQuoteCache() {
  const queryClient = useQueryClient();
  return useMemo(
    () => new ReusableReceiveQuoteCache(queryClient),
    [queryClient],
  );
}

/**
 * Hook to get the active reusable receive quotes cache.
 */
function useActiveReusableReceiveQuotesCache() {
  const queryClient = useQueryClient();
  return useMemo(
    () => new ActiveReusableReceiveQuotesCache(queryClient),
    [queryClient],
  );
}

/**
 * Hook to create a reusable onchain receive quote.
 */
export function useCreateOnchainReceiveQuote() {
  const userId = useUser((user) => user.id);
  const reusableCashuReceiveQuoteService =
    useReusableCashuReceiveQuoteService();
  const reusableReceiveQuoteCache = useReusableReceiveQuoteCache();

  return useMutation({
    scope: {
      id: 'create-reusable-onchain-receive-quote',
    },
    mutationFn: async ({ account }: CreateReusableOnchainQuoteProps) => {
      const onchainQuote =
        await reusableCashuReceiveQuoteService.getOnchainQuote({
          account,
        });

      return reusableCashuReceiveQuoteService.createReusableOnchainQuote({
        userId,
        account,
        onchainQuote,
      });
    },
    onSuccess: (data) => {
      reusableReceiveQuoteCache.add(data);
    },
    retry: 1,
  });
}

/**
 * Hook to get all reusable receive quotes for the current user.
 */
export function useReusableReceiveQuotes() {
  const userId = useUser((user) => user.id);
  const reusableCashuReceiveQuoteRepository =
    useReusableCashuReceiveQuoteRepository();

  return useQuery({
    queryKey: ['reusable-cashu-receive-quotes', userId],
    queryFn: () => reusableCashuReceiveQuoteRepository.getAll(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to get a specific reusable receive quote by ID.
 */
export function useReusableReceiveQuote(id: string | undefined) {
  const reusableCashuReceiveQuoteRepository =
    useReusableCashuReceiveQuoteRepository();

  return useQuery({
    queryKey: ['reusable-cashu-receive-quote', id],
    queryFn: () => (id ? reusableCashuReceiveQuoteRepository.get(id) : null),
    enabled: !!id,
  });
}

/**
 * Hook to subscribe to database changes for reusable receive quotes.
 */
function useOnReusableReceiveQuoteChange({
  onCreated,
  onUpdated,
}: {
  onCreated: (quote: ReusableCashuReceiveQuote) => void;
  onUpdated: (quote: ReusableCashuReceiveQuote) => void;
}) {
  const onCreatedRef = useLatest(onCreated);
  const onUpdatedRef = useLatest(onUpdated);
  const queryClient = useQueryClient();

  return useSupabaseRealtimeSubscription({
    channelFactory: () =>
      agicashDb.channel('reusable-cashu-receive-quotes').on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'reusable_cashu_receive_quotes',
        },
        (
          payload: RealtimePostgresChangesPayload<AgicashDbReusableCashuReceiveQuote>,
        ) => {
          if (payload.eventType === 'INSERT') {
            const addedQuote = ReusableCashuReceiveQuoteRepository.toQuote(
              payload.new,
            );
            onCreatedRef.current(addedQuote);
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuote = ReusableCashuReceiveQuoteRepository.toQuote(
              payload.new,
            );
            onUpdatedRef.current(updatedQuote);
          }
        },
      ),
    onReconnected: () => {
      // Invalidate active reusable receive quotes query on reconnection
      queryClient.invalidateQueries({
        queryKey: [activeReusableReceiveQuotesQueryKey],
      });
    },
  });
}

/**
 * Hook to get active reusable receive quotes for the current user.
 * Active quotes are those that can still receive payments (not expired/deactivated).
 */
const useActiveReusableReceiveQuotes = () => {
  const reusableCashuReceiveQuoteRepository =
    useReusableCashuReceiveQuoteRepository();
  const userId = useUser((user) => user.id);

  const { data } = useQuery({
    queryKey: [activeReusableReceiveQuotesQueryKey],
    queryFn: () => reusableCashuReceiveQuoteRepository.getAll(userId), // TODO: Filter for active quotes only
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    throwOnError: true,
  });

  return data ?? [];
};

/**
 * Function to check the status of an onchain mint quote.
 */
const checkOnchainMintQuote = async (
  account: CashuAccount,
  quote: ReusableCashuReceiveQuote,
): Promise<OnchainMintQuoteResponse> => {
  const cashuUnit = getCashuUnit(quote.currency);
  const wallet = getCashuWallet(account.mintUrl, { unit: cashuUnit });

  return wallet.checkMintQuoteOnchain(quote.quoteId);
};

type TrackOnchainMintQuotesWithPollingProps = {
  quotes: ReusableCashuReceiveQuote[];
  getCashuAccount: (accountId: string) => Promise<CashuAccount>;
  onFetched: (
    quote: ReusableCashuReceiveQuote,
    mintQuoteResponse: OnchainMintQuoteResponse,
  ) => void;
};

/**
 * Polls the state of the provided onchain mint quotes for reusable quotes.
 */
const useTrackOnchainMintQuotesWithPolling = ({
  quotes,
  getCashuAccount,
  onFetched,
}: TrackOnchainMintQuotesWithPollingProps) => {
  useQueries({
    queries: quotes.map((quote) => ({
      queryKey: ['reusable-onchain-mint-quote', quote.quoteId],
      queryFn: async () => {
        try {
          const account = await getCashuAccount(quote.accountId);
          const mintQuoteResponse = await checkOnchainMintQuote(account, quote);

          onFetched(quote, mintQuoteResponse);

          return mintQuoteResponse;
        } catch (error) {
          console.error('Error checking onchain mint quote:', error);
          throw error;
        }
      },
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchInterval: () => {
        // TODO: Adjust polling interval based on error type
        return 10 * 1000; // Poll every 10 seconds for onchain
      },
      refetchIntervalInBackground: true,
    })),
  });
};

type OnReusableMintQuoteStateChangeProps = {
  quotes: ReusableCashuReceiveQuote[];
  onPaid: (
    account: CashuAccount,
    quote: ReusableCashuReceiveQuote,
    mintQuoteResponse: OnchainMintQuoteResponse,
  ) => void;
};

/**
 * Tracks the state of reusable mint quotes using polling only.
 * When payment is detected (amount_paid increased), calls onPaid callback.
 */
const useOnReusableMintQuoteStateChange = ({
  quotes,
  onPaid,
}: OnReusableMintQuoteStateChangeProps) => {
  const onPaidRef = useLatest(onPaid);
  const getCashuAccount = useGetLatestCashuAccount();

  const processMintQuote = useCallback(
    async (
      quote: ReusableCashuReceiveQuote,
      mintQuote: OnchainMintQuoteResponse,
    ) => {
      // Check if the amount paid has increased
      const mintQuoteAmountPaid =
        mintQuote.amount_paid - mintQuote.amount_issued;
      if (mintQuoteAmountPaid > 0) {
        console.debug('Payment detected on reusable quote', {
          quoteId: quote.quoteId,
          previousAmountPaid: quote.amountPaid,
          newAmountPaid: mintQuoteAmountPaid,
          quote,
          mintQuote,
        });

        const account = await getCashuAccount(quote.accountId);
        onPaidRef.current(account, quote, mintQuote);
      }
    },
    [getCashuAccount],
  );

  // For now, partition all quotes to polling (no websockets yet)
  const quotesToPoll = quotes;

  useTrackOnchainMintQuotesWithPolling({
    quotes: quotesToPoll,
    getCashuAccount,
    onFetched: processMintQuote,
  });
};

/**
 * Hook to track active reusable receive quotes and manage their cache.
 * Combines database subscription with local caching.
 */
export function useTrackActiveReusableReceiveQuotes() {
  const activeQuotesCache = useActiveReusableReceiveQuotesCache();
  const reusableQuoteCache = useReusableReceiveQuoteCache();

  return useOnReusableReceiveQuoteChange({
    onCreated: (quote) => {
      activeQuotesCache.add(quote);
    },
    onUpdated: (quote) => {
      reusableQuoteCache.updateIfExists(quote);
      activeQuotesCache.update(quote);
    },
  });
}

/**
 * Hook to process reusable receive quote tasks.
 * This is the main hook that combines everything - tracking active quotes,
 * polling for payments, and handling payment events.
 */
export function useProcessReusableReceiveQuoteTasks() {
  const activeQuotes = useActiveReusableReceiveQuotes();
  const xpub = useUser((user) => user.cashuLockingXpub);

  console.log('Active quotes', activeQuotes);

  const { mutate: createCashuReceiveQuote } = useCreateCashuReceiveQuote();

  useOnReusableMintQuoteStateChange({
    quotes: activeQuotes,
    onPaid: async (account, quote, mintQuoteResponse) => {
      const amountNumber =
        mintQuoteResponse.amount_paid - mintQuoteResponse.amount_issued;

      // Extract the relative path from the full derivation path
      // quote.lockingDerivationPath is like "m/129372'/0'/0'/12345"
      // We need just "m/12345" relative to the xpub at BASE_CASHU_LOCKING_DERIVATION_PATH
      // TODO: this data should already be in the quote object
      const relativePath = quote.lockingDerivationPath.replace(
        `${BASE_CASHU_LOCKING_DERIVATION_PATH}/`,
        'm/',
      );
      const lockingPublicKey = derivePublicKey(xpub, relativePath);

      const receiveQuote: ReusableCashuReceiveOnchainQuote = {
        lockingPublicKey,
        fullLockingDerivationPath: quote.lockingDerivationPath,

        mintQuote: {
          ...mintQuoteResponse,
          amount: amountNumber,
        },
      };
      createCashuReceiveQuote({
        account,
        amount: new Money({
          currency: quote.currency,
          amount: amountNumber,
          unit: getCashuUnit(quote.currency),
        }),
        type: 'ONCHAIN',
        receiveQuote,
      });
    },
  });
}
