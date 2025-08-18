import {
  HttpResponseError,
  type MintQuoteResponse,
  type WebSocketSupport,
} from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type Query,
  type QueryClient,
  type UseQueryResult,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type MintInfo,
  areMintUrlsEqual,
  getCashuUnit,
  getCashuWallet,
  getWalletCurrency,
} from '~/lib/cashu';
import type { Money } from '~/lib/money';
import { useSupabaseRealtimeSubscription } from '~/lib/supabase/supabase-realtime';
import {
  type LongTimeout,
  clearLongTimeout,
  setLongTimeout,
} from '~/lib/timeout';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount, ExtendedCashuAccount } from '../accounts/account';
import {
  useAccountsCache,
  useGetLatestCashuAccount,
} from '../accounts/account-hooks';
import {
  type AgicashDbCashuReceiveQuote,
  agicashDb,
} from '../agicash-db/database';
import { useUser } from '../user/user-hooks';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  CashuReceiveQuoteRepository,
  useCashuReceiveQuoteRepository,
} from './cashu-receive-quote-repository';
import { useCashuReceiveQuoteService } from './cashu-receive-quote-service';
import { MintQuoteSubscriptionManager } from './mint-quote-subscription-manager';

type CreateProps = {
  account: ExtendedCashuAccount;
  amount: Money;
  description?: string;
};

// Query that tracks the "active" cashu receive quote. Active one is the one that user created in current browser session.
// We want to track active quote even after it is expired and completed which is why we can't use pending quotes query.
// Pending quotes query is used for active pending quote plus "background" pending quotes. "Background" quotes are quotes
// that were created in previous browser sessions.
const cashuReceiveQuoteQueryKey = 'cashu-receive-quote';
// Query that tracks all pending cashu receive quotes (active and background ones).
const pendingCashuReceiveQuotesQueryKey = 'pending-cashu-receive-quotes';

class CashuReceiveQuoteCache {
  constructor(private readonly queryClient: QueryClient) {}

  get(quoteId: string) {
    return this.queryClient.getQueryData<CashuReceiveQuote>([
      cashuReceiveQuoteQueryKey,
      quoteId,
    ]);
  }

  add(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote>(
      [cashuReceiveQuoteQueryKey, quote.id],
      quote,
    );
  }

  updateIfExists(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote>(
      [cashuReceiveQuoteQueryKey, quote.id],
      (curr) => (curr ? quote : undefined),
    );
  }
}

class PendingCashuReceiveQuotesCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote[]>(
      [pendingCashuReceiveQuotesQueryKey],
      (curr) => [...(curr ?? []), quote],
    );
  }

  update(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote[]>(
      [pendingCashuReceiveQuotesQueryKey],
      (curr) => curr?.map((q) => (q.id === quote.id ? quote : q)),
    );
  }

  remove(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote[]>(
      [pendingCashuReceiveQuotesQueryKey],
      (curr) => curr?.filter((q) => q.id !== quote.id),
    );
  }

  getByMintQuoteId(mintQuoteId: string) {
    const quotes = this.queryClient.getQueryData<CashuReceiveQuote[]>([
      pendingCashuReceiveQuotesQueryKey,
    ]);
    return quotes?.find((q) => q.quoteId === mintQuoteId);
  }
}

function usePendingCashuReceiveQuotesCache() {
  const queryClient = useQueryClient();
  return useMemo(
    () => new PendingCashuReceiveQuotesCache(queryClient),
    [queryClient],
  );
}

export function useCreateCashuReceiveQuote() {
  const userId = useUser((user) => user.id);
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  const cashuReceiveQuoteCache = useCashuReceiveQuoteCache();

  return useMutation({
    mutationKey: ['create-cashu-receive-quote'],
    scope: {
      id: 'create-cashu-receive-quote',
    },
    mutationFn: async ({ account, amount, description }: CreateProps) => {
      const lightningQuote = await cashuReceiveQuoteService.getLightningQuote({
        account,
        amount,
        description,
      });

      return cashuReceiveQuoteService.createReceiveQuote({
        userId,
        account,
        receiveType: 'LIGHTNING',
        receiveQuote: lightningQuote,
      });
    },
    onSuccess: (data) => {
      cashuReceiveQuoteCache.add(data);
    },
    retry: 1,
  });
}

export function useFailCashuReceiveQuote() {
  const cashuReceiveQuoteRepository = useCashuReceiveQuoteRepository();
  return useMutation({
    mutationFn: ({
      quoteId,
      version,
      reason,
    }: { quoteId: string; version: number; reason: string }) =>
      cashuReceiveQuoteRepository.fail({ id: quoteId, version, reason }),
    retry: 3,
  });
}

function useCashuReceiveQuoteCache() {
  const queryClient = useQueryClient();
  return useMemo(() => new CashuReceiveQuoteCache(queryClient), [queryClient]);
}

type UseCashuReceiveQuoteProps = {
  quoteId?: string;
  onPaid?: (quote: CashuReceiveQuote) => void;
  onExpired?: (quote: CashuReceiveQuote) => void;
};

type UseCashuReceiveQuoteResponse =
  | {
      status: 'LOADING';
      quote?: undefined;
    }
  | {
      status: CashuReceiveQuote['state'];
      quote: CashuReceiveQuote;
    };

export function useCashuReceiveQuote({
  quoteId,
  onPaid,
  onExpired,
}: UseCashuReceiveQuoteProps): UseCashuReceiveQuoteResponse {
  const enabled = !!quoteId;
  const onPaidRef = useLatest(onPaid);
  const onExpiredRef = useLatest(onExpired);
  const cache = useCashuReceiveQuoteCache();

  const { data } = useQuery({
    queryKey: [cashuReceiveQuoteQueryKey, quoteId],
    queryFn: () => cache.get(quoteId ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    enabled,
  });

  useEffect(() => {
    if (!data) return;

    if (data.state === 'COMPLETED') {
      onPaidRef.current?.(data);
    } else if (data.state === 'EXPIRED') {
      onExpiredRef.current?.(data);
    }
  }, [data]);

  if (!data) {
    return { status: 'LOADING' };
  }

  return {
    status: data.state,
    quote: data,
  };
}

function useOnCashuReceiveQuoteChange({
  onCreated,
  onUpdated,
}: {
  onCreated: (quote: CashuReceiveQuote) => void;
  onUpdated: (quote: CashuReceiveQuote) => void;
}) {
  const onCreatedRef = useLatest(onCreated);
  const onUpdatedRef = useLatest(onUpdated);
  const queryClient = useQueryClient();

  return useSupabaseRealtimeSubscription({
    channelFactory: () =>
      agicashDb.channel('cashu-receive-quotes').on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'cashu_receive_quotes',
        },
        (
          payload: RealtimePostgresChangesPayload<AgicashDbCashuReceiveQuote>,
        ) => {
          if (payload.eventType === 'INSERT') {
            const addedQuote = CashuReceiveQuoteRepository.toQuote(payload.new);
            onCreatedRef.current(addedQuote);
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuote = CashuReceiveQuoteRepository.toQuote(
              payload.new,
            );
            onUpdatedRef.current(updatedQuote);
          }
        },
      ),
    onReconnected: () => {
      // Invalidate the pending cashu receive quotes query so that the quotes are re-fetched and the cache is updated.
      // This is needed to get any data that might have been updated while the re-connection was in progress.
      queryClient.invalidateQueries({
        queryKey: [pendingCashuReceiveQuotesQueryKey],
      });
    },
  });
}

const usePendingCashuReceiveQuotes = () => {
  const cashuReceiveQuoteRepository = useCashuReceiveQuoteRepository();
  const userId = useUser((user) => user.id);

  const { data } = useQuery({
    queryKey: [pendingCashuReceiveQuotesQueryKey],
    queryFn: () => cashuReceiveQuoteRepository.getPending(userId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    throwOnError: true,
  });

  return data ?? [];
};

const mintsToExcludeFromWebSockets = [
  // The reason that we need to exlude cubabitcoin is that there was a bug which would not update the invoice state unless a GET request
  // is made to check the quote status. We can remove this when cubabitcoin is updated to nutshell > 0.17.1 - https://github.com/cashubtc/nutshell/releases/tag/0.17.1
  'https://mint.cubabitcoin.org',
];

const checkIfMintSupportsWebSocketsForMintQuotes = (
  mintUrl: string,
  mintInfo: MintInfo,
  currency: string,
): boolean => {
  if (mintsToExcludeFromWebSockets.some((x) => areMintUrlsEqual(x, mintUrl))) {
    return false;
  }
  const wallet = getCashuWallet(mintUrl);
  const walletCurrency = getWalletCurrency(wallet);
  const nut17Info = mintInfo.isSupported(17);
  const params = nut17Info.params ?? [];
  const supportsWebSocketsForMintQuotes =
    nut17Info.supported &&
    params.some(
      (support: WebSocketSupport) =>
        support.method === 'bolt11' &&
        walletCurrency === currency &&
        support.commands.includes('bolt11_mint_quote'),
    );

  return supportsWebSocketsForMintQuotes;
};

type TrackMintQuotesWithPollingProps = {
  quotes: CashuReceiveQuote[];
  getCashuAccount: (accountId: string) => Promise<CashuAccount>;
  onFetched: (mintQuoteResponse: MintQuoteResponse) => void;
};

const checkMintQuote = async (
  account: CashuAccount,
  quote: CashuReceiveQuote,
): Promise<MintQuoteResponse> => {
  const cashuUnit = getCashuUnit(quote.amount.currency);
  const wallet = getCashuWallet(account.mintUrl, { unit: cashuUnit });

  const partialMintQuoteResponse = await wallet.checkMintQuote(quote.quoteId);

  return {
    ...partialMintQuoteResponse,
    // Amount and unit were added to the response later and some mints might still not be setting them atm so temporily we set them from the values we stored in the cashu receive quote.
    // See https://github.com/cashubtc/nuts/commit/e7112cd4ebfe14f0aaffa48cbdb5bd60fc450c51 and https://github.com/cashubtc/cashu-ts/pull/275/files#diff-820f0c31c07f61cf1b853d8a028670f0530af7965d60ec1853b048b626ae46ad
    // for more details. This can be removed once all the mints are updated and cashu-ts is updated.
    amount: partialMintQuoteResponse.amount ?? quote.amount.toNumber(cashuUnit),
    unit: wallet.unit,
  };
};

/**
 * Polls the state of the provided mint quotes.
 */
const useTrackMintQuotesWithPolling = ({
  quotes,
  getCashuAccount,
  onFetched,
}: TrackMintQuotesWithPollingProps) => {
  useQueries({
    queries: quotes.map((quote) => ({
      queryKey: ['mint-quote', quote.quoteId],
      queryFn: async () => {
        try {
          const account = await getCashuAccount(quote.accountId);
          const mintQuoteResponse = await checkMintQuote(account, quote);

          onFetched(mintQuoteResponse);

          return mintQuoteResponse;
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchInterval: (query: Query) => {
        const error = query.state.error;
        const isRateLimitError =
          error instanceof HttpResponseError && error.status === 429;

        if (isRateLimitError) {
          return 60 * 1000;
        }

        return 10 * 1000;
      },
      refetchIntervalInBackground: true,
    })),
  });
};

type TrackMintQuotesWithWebSocketProps = {
  quotesByMint: Record<string, CashuReceiveQuote[]>;
  getCashuAccount: (accountId: string) => Promise<CashuAccount>;
  onUpdate: (mintQuoteResponse: MintQuoteResponse) => void;
};

/**
 * Subscribes to the mint quotes updates using web socket.
 */
const useTrackMintQuotesWithWebSocket = ({
  quotesByMint,
  getCashuAccount,
  onUpdate,
}: TrackMintQuotesWithWebSocketProps) => {
  const [subscriptionManager] = useState(
    () => new MintQuoteSubscriptionManager(),
  );
  const queryClient = useQueryClient();

  const { mutate: subscribe } = useMutation({
    mutationFn: (props: Parameters<typeof subscriptionManager.subscribe>[0]) =>
      subscriptionManager.subscribe(props),
    retry: 5,
    onError: (error, variables) => {
      console.error('Error subscribing to mint quote updates', {
        mintUrl: variables.mintUrl,
        cause: error,
      });
    },
  });

  useEffect(() => {
    Object.entries(quotesByMint).map(([mintUrl, quotes]) =>
      subscribe({ mintUrl, quotes, onUpdate }),
    );
  }, [subscribe, quotesByMint, onUpdate]);

  const getMintQuote = useCallback(
    (receiveQuote: CashuReceiveQuote) =>
      queryClient.fetchQuery({
        queryKey: ['check-mint-quote', receiveQuote.quoteId],
        queryFn: async () => {
          const account = await getCashuAccount(receiveQuote.accountId);
          return checkMintQuote(account, receiveQuote);
        },
        retry: 5,
        staleTime: 0,
        gcTime: 0,
      }),
    [queryClient, getCashuAccount],
  );

  useEffect(() => {
    // We need to check the state of the quote upon expiration because there is no state change for the expiration
    // so socket will not notify us.
    if (Object.keys(quotesByMint).length === 0) return;

    const receiveQuotes = Object.entries(quotesByMint).flatMap(
      ([_, quotes]) => quotes,
    );

    const timeouts: LongTimeout[] = [];

    for (const receiveQuote of receiveQuotes) {
      const expiresAt = new Date(receiveQuote.expiresAt);
      const msUntilExpiration = expiresAt.getTime() - Date.now();

      const quoteTimeout = setLongTimeout(async () => {
        try {
          const mintQuote = await getMintQuote(receiveQuote);
          return onUpdate(mintQuote);
        } catch (error) {
          console.error('Error checking mint quote upon expiration', {
            cause: error,
          });
        }
      }, msUntilExpiration);

      timeouts.push(quoteTimeout);
    }

    return () => {
      timeouts.forEach((timeout) => clearLongTimeout(timeout));
    };
  }, [quotesByMint, getMintQuote, onUpdate]);
};

type MintInfoQueryResult = UseQueryResult<
  {
    mintUrl: string;
    mintInfo: MintInfo;
  },
  Error
>;

const combineMintInfoQueryResults = (results: MintInfoQueryResult[]) => {
  return results.reduce((acc, curr) => {
    if (curr.data) {
      acc.set(curr.data.mintUrl, curr);
    }
    return acc;
  }, new Map<string, MintInfoQueryResult>());
};

const mintInfoStaleTimeInMs = 30 * 60 * 1000;

const usePartitionQuotesByStateCheckType = ({
  quotes,
  accountsCache,
}: {
  quotes: CashuReceiveQuote[];
  accountsCache: ReturnType<typeof useAccountsCache>;
}) => {
  const getCashuAccount = useCallback(
    (accountId: string) => {
      const account = accountsCache.get(accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error(`Cashu account not found for id: ${accountId}`);
      }
      return account;
    },
    [accountsCache],
  );

  const mintUrls = useMemo(() => {
    const distinctAccountIds = [...new Set(quotes.map((q) => q.accountId))];
    const accounts = distinctAccountIds.map(getCashuAccount);
    return [...new Set(accounts.map((x) => x.mintUrl))];
  }, [quotes, getCashuAccount]);

  const mintInfoMap = useQueries({
    queries: mintUrls.map((mintUrl) => ({
      queryKey: ['mint-info', mintUrl],
      queryFn: async () => {
        const wallet = getCashuWallet(mintUrl);
        const mintInfo = await wallet.getMintInfo();
        return { mintUrl, mintInfo };
      },
      initialData: {
        mintUrl,
        mintInfo: null,
      },
      initialDataUpdatedAt: Date.now() - (mintInfoStaleTimeInMs + 1000),
      staleTime: mintInfoStaleTimeInMs,
    })),
    combine: combineMintInfoQueryResults,
  });

  return useMemo(() => {
    const quotesToSubscribeTo: Record<string, CashuReceiveQuote[]> = {};
    const quotesToPoll: CashuReceiveQuote[] = [];

    quotes.forEach((quote) => {
      const account = getCashuAccount(quote.accountId);
      const mintInfoQueryResult = mintInfoMap.get(account.mintUrl);
      if (
        !mintInfoQueryResult ||
        mintInfoQueryResult.isPending ||
        !mintInfoQueryResult.data?.mintInfo
      ) {
        // Mint info query result is not available yet or pending so this quote is not partitioned yet.
        // When the query result is available, this will be re-run and the quote will be partitioned.
        return;
      }

      if (mintInfoQueryResult.isError) {
        console.warn(
          `Fetching mint info failed for ${account.mintUrl}. Will fallback to polling.`,
          {
            accountId: account.id,
            error: mintInfoQueryResult.error,
          },
        );
        quotesToPoll.push(quote);
        return;
      }

      const mintInfo = mintInfoQueryResult.data.mintInfo;

      const mintSupportsWebSockets = checkIfMintSupportsWebSocketsForMintQuotes(
        account.mintUrl,
        mintInfo,
        account.currency,
      );

      if (mintSupportsWebSockets) {
        const quotesForMint = quotesToSubscribeTo[account.mintUrl] ?? [];
        quotesToSubscribeTo[account.mintUrl] = quotesForMint.concat(quote);
      } else {
        quotesToPoll.push(quote);
      }
    });

    return { quotesToSubscribeTo, quotesToPoll };
  }, [mintInfoMap, quotes, getCashuAccount]);
};

type OnMintQuoteStateChangeProps = {
  quotes: CashuReceiveQuote[];
  onPaid: (account: CashuAccount, quote: CashuReceiveQuote) => void;
  onIssued: (account: CashuAccount, quote: CashuReceiveQuote) => void;
  onExpired: (quote: CashuReceiveQuote) => void;
};

/**
 * Tracks the state of the mint quotes. It uses web socket for the mints that support it and polling for the rest.
 */
const useOnMintQuoteStateChange = ({
  quotes,
  onPaid,
  onIssued,
  onExpired,
}: OnMintQuoteStateChangeProps) => {
  const onPaidRef = useLatest(onPaid);
  const onIssuedRef = useLatest(onIssued);
  const onExpiredRef = useLatest(onExpired);
  const accountsCache = useAccountsCache();
  const pendingQuotesCache = usePendingCashuReceiveQuotesCache();
  const getCashuAccount = useGetLatestCashuAccount();

  const processMintQuote = useCallback(
    async (mintQuote: MintQuoteResponse) => {
      console.debug('Mint quote updated', mintQuote);

      const relatedReceiveQuote = pendingQuotesCache.getByMintQuoteId(
        mintQuote.quote,
      );

      if (!relatedReceiveQuote) {
        console.warn('No related receive quote found for the mint quote');
        return;
      }

      const account = await getCashuAccount(relatedReceiveQuote.accountId);

      const expiresAt = new Date(relatedReceiveQuote.expiresAt);
      const now = new Date();

      if (
        mintQuote.state === 'UNPAID' &&
        expiresAt < now &&
        relatedReceiveQuote.state !== 'EXPIRED'
      ) {
        onExpiredRef.current(relatedReceiveQuote);
      } else if (
        mintQuote.state === 'PAID' &&
        relatedReceiveQuote.state !== 'PAID'
      ) {
        onPaidRef.current(account, relatedReceiveQuote);
      } else if (
        mintQuote.state === 'ISSUED' &&
        relatedReceiveQuote.state !== 'COMPLETED'
      ) {
        onIssuedRef.current(account, relatedReceiveQuote);
      }
    },
    [pendingQuotesCache, getCashuAccount],
  );

  const { quotesToSubscribeTo, quotesToPoll } =
    usePartitionQuotesByStateCheckType({
      quotes,
      accountsCache,
    });

  useTrackMintQuotesWithWebSocket({
    quotesByMint: quotesToSubscribeTo,
    getCashuAccount,
    onUpdate: processMintQuote,
  });

  useTrackMintQuotesWithPolling({
    quotes: quotesToPoll,
    getCashuAccount,
    onFetched: processMintQuote,
  });
};

export function useTrackPendingCashuReceiveQuotes() {
  const pendingQuotesCache = usePendingCashuReceiveQuotesCache();
  const cashuReceiveQuoteCache = useCashuReceiveQuoteCache();

  return useOnCashuReceiveQuoteChange({
    onCreated: (quote) => {
      pendingQuotesCache.add(quote);
    },
    onUpdated: (quote) => {
      cashuReceiveQuoteCache.updateIfExists(quote);

      const isQuoteStillPending = ['UNPAID', 'PAID'].includes(quote.state);
      if (isQuoteStillPending) {
        pendingQuotesCache.update(quote);
      } else {
        pendingQuotesCache.remove(quote);
      }
    },
  });
}

export function useProcessCashuReceiveQuoteTasks() {
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  const pendingQuotes = usePendingCashuReceiveQuotes();
  const getCashuAccount = useGetLatestCashuAccount();

  const { mutate: completeReceiveQuote } = useMutation({
    mutationFn: async (receiveQuoteId: string) => {
      const quote = pendingQuotes.find((q) => q.id === receiveQuoteId);
      if (!quote) {
        // This means that the quote is not pending anymore so it was removed from the cache.
        // This can happen if the quote was completed or failed in the meantime.
        return;
      }
      const account = await getCashuAccount(quote.accountId);

      return cashuReceiveQuoteService.completeReceive(account, quote);
    },
    retry: 3,
    throwOnError: true,
    onError: (error, receiveQuoteId) => {
      console.error('Complete receive quote error', {
        cause: error,
        receiveQuoteId,
      });
    },
  });

  const { mutate: expireReceiveQuote } = useMutation({
    mutationFn: async (receiveQuoteId: string) => {
      const quote = pendingQuotes.find((q) => q.id === receiveQuoteId);
      if (!quote) {
        // This means that the quote is not pending anymore so it was removed from the cache.
        // This can happen if the quote was completed or failed in the meantime.
        return;
      }

      await cashuReceiveQuoteService.expire(quote);
    },
    retry: 3,
    throwOnError: true,
    onError: (error, receiveQuoteId) => {
      console.error('Expire receive quote error', {
        cause: error,
        receiveQuoteId,
      });
    },
  });

  useOnMintQuoteStateChange({
    quotes: pendingQuotes,
    onPaid: (_, quote) => {
      completeReceiveQuote(quote.id);
    },
    onIssued: (_, quote) => {
      completeReceiveQuote(quote.id);
    },
    onExpired: (quote) => {
      expireReceiveQuote(quote.id);
    },
  });
}
