import {
  HttpResponseError,
  type MintQuoteResponse,
  type Token,
  type WebSocketSupport,
} from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type Query,
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { getCashuWallet, getWalletCurrency } from '~/lib/cashu';
import type { Money } from '~/lib/money';
import {
  type LongTimeout,
  clearLongTimeout,
  setLongTimeout,
} from '~/lib/timeout';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount } from '../accounts/account';
import { useAccountsCache } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuReceiveQuote,
  boardwalkDb,
} from '../boardwalk-db/database';
import { useUserRef } from '../user/user-hooks';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  CashuReceiveQuoteRepository,
  useCashuReceiveQuoteRepository,
} from './cashu-receive-quote-repository';
import { useCashuReceiveQuoteService } from './cashu-receive-quote-service';

type CreateProps = {
  account: CashuAccount;
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
      [pendingCashuReceiveQuotesQueryKey, quote.userId],
      (curr) => [...(curr ?? []), quote],
    );
  }

  update(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote[]>(
      [pendingCashuReceiveQuotesQueryKey, quote.userId],
      (curr) => curr?.map((q) => (q.id === quote.id ? quote : q)),
    );
  }

  remove(quote: CashuReceiveQuote) {
    this.queryClient.setQueryData<CashuReceiveQuote[]>(
      [pendingCashuReceiveQuotesQueryKey, quote.userId],
      (curr) => curr?.filter((q) => q.id !== quote.id),
    );
  }
}

export function useCreateCashuReceiveQuote() {
  const userRef = useUserRef();
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  const cashuReceiveQuoteCache = useCashuReceiveQuoteCache();

  return useMutation({
    mutationKey: ['create-cashu-receive-quote'],
    scope: {
      id: 'create-cashu-receive-quote',
    },
    mutationFn: ({ account, amount, description }: CreateProps) =>
      cashuReceiveQuoteService.createLightningQuote({
        userId: userRef.current.id,
        account,
        amount,
        description,
      }),
    onSuccess: (data) => {
      cashuReceiveQuoteCache.add(data);
    },
    retry: 1,
  });
}

export function useMeltTokenToCashuAccount() {
  const userRef = useUserRef();
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  const cashuReceiveQuoteCache = useCashuReceiveQuoteCache();

  return useMutation({
    mutationKey: ['melt-token-to-cashu-account'],
    scope: {
      id: 'melt-token-to-cashu-account',
    },
    mutationFn: ({ token, account }: { token: Token; account: CashuAccount }) =>
      cashuReceiveQuoteService.meltTokenToCashuAccount({
        userId: userRef.current.id,
        token,
        account,
      }),
    onSuccess: (data) => {
      cashuReceiveQuoteCache.add(data);
    },
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

  useEffect(() => {
    const channel = boardwalkDb
      .channel('cashu-receive-quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'cashu_receive_quotes',
        },
        (
          payload: RealtimePostgresChangesPayload<BoardwalkDbCashuReceiveQuote>,
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
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);
}

const usePendingCashuReceiveQuotes = () => {
  const queryClient = useQueryClient();
  const cashuReceiveQuoteRepository = useCashuReceiveQuoteRepository();
  const userRef = useUserRef();
  const pendingQuotesCache = useMemo(
    () => new PendingCashuReceiveQuotesCache(queryClient),
    [queryClient],
  );
  const cashuReceiveQuoteCache = useCashuReceiveQuoteCache();

  const { data } = useQuery({
    queryKey: [pendingCashuReceiveQuotesQueryKey, userRef.current.id],
    queryFn: () => cashuReceiveQuoteRepository.getPending(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
    throwOnError: true,
  });

  useOnCashuReceiveQuoteChange({
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

  return data ?? [];
};

const checkIfMintSupportsWebSocketsForMintQuotes = async (
  mintUrl: string,
  currency: string,
): Promise<boolean> => {
  const wallet = getCashuWallet(mintUrl);
  const walletCurrency = getWalletCurrency(wallet);
  const mintInfo = await wallet.getMintInfo();
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
      queryKey: ['check-mint-quote', quote.quoteId],
      queryFn: async () => {
        try {
          const account = await getCashuAccount(quote.accountId);
          const wallet = getCashuWallet(account.mintUrl);

          const mintQuoteResponse = await wallet.checkMintQuote(quote.quoteId);
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
  useEffect(() => {
    const subcribeToMintQuoteUpdates = async (
      quotesByMint: Record<string, CashuReceiveQuote[]>,
    ) => {
      const subscriptions = Object.entries(quotesByMint).map(
        ([mintUrl, quotes]) => {
          const wallet = getCashuWallet(mintUrl);
          return wallet.onMintQuoteUpdates(
            quotes.map((x) => x.quoteId),
            onUpdate,
            // TODO: what should we do here on error?
            (error) =>
              console.error('Mint quote updates socket error', {
                cause: error,
              }),
          );
        },
      );

      const subscriptionCancellers = await Promise.all(subscriptions);

      return () => {
        subscriptionCancellers.forEach((cancel) => cancel());
      };
    };

    let cleanup: (() => void) | undefined;

    subcribeToMintQuoteUpdates(quotesByMint).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      cleanup?.();
    };
  }, [quotesByMint, onUpdate]);

  useEffect(() => {
    // We need to check the state of the quote upon expiration because there is no state change for the expiration
    // so socket will not notify us.
    if (Object.keys(quotesByMint).length === 0) return;

    const receiveQuotes = Object.entries(quotesByMint).flatMap(
      ([_, quotes]) => quotes,
    );

    const timeouts: LongTimeout[] = [];

    for (const receiveQuote of receiveQuotes) {
      const msUntilExpiration =
        new Date(receiveQuote.expiresAt).getTime() - Date.now();
      const quoteTimeout = setLongTimeout(async () => {
        const account = await getCashuAccount(receiveQuote.accountId);
        const wallet = getCashuWallet(account.mintUrl);
        const mintQuote = await wallet.checkMintQuote(receiveQuote.quoteId);

        return onUpdate(mintQuote);
      }, msUntilExpiration);
      timeouts.push(quoteTimeout);
    }

    return () => {
      timeouts.forEach((timeout) => clearLongTimeout(timeout));
    };
  }, [quotesByMint, onUpdate, getCashuAccount]);
};

const usePartitionQuotesByStateCheckType = ({
  quotes,
  getCashuAccount,
}: {
  quotes: CashuReceiveQuote[];
  getCashuAccount: (accountId: string) => Promise<CashuAccount>;
}) => {
  const { data } = useQuery({
    queryKey: ['quotes-partition-by-state-check-type', quotes],
    queryFn: async () => {
      const quotesToSubscribeTo: Record<string, CashuReceiveQuote[]> = {};
      const quotesToPoll: CashuReceiveQuote[] = [];

      const promises = quotes.map(async (quote) => {
        const account = await getCashuAccount(quote.accountId);

        const supportsSocketForMintQuotes =
          await checkIfMintSupportsWebSocketsForMintQuotes(
            account.mintUrl,
            account.currency,
          );

        if (supportsSocketForMintQuotes) {
          quotesToSubscribeTo[account.mintUrl] = (
            quotesToSubscribeTo[account.mintUrl] ?? []
          ).concat(quote);
        } else {
          quotesToPoll.push(quote);
        }
      });

      await Promise.all(promises);

      return {
        quotesToSubscribeTo,
        quotesToPoll,
      };
    },
    initialData: {
      quotesToSubscribeTo: {},
      quotesToPoll: [],
    },
  });

  return data;
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

  const getCashuAccount = useCallback(
    async (accountId: string) => {
      const account = await accountsCache.getLatest(accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error(`Account not found for id: ${accountId}`);
      }
      return account;
    },
    [accountsCache],
  );

  const processMintQuote = useCallback(
    async (mintQuote: MintQuoteResponse) => {
      console.debug('Processing mint quote', mintQuote);

      const relatedReceiveQuote = quotes.find(
        (receiveQuote) => receiveQuote.quoteId === mintQuote.quote,
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
    [quotes, getCashuAccount],
  );

  const { quotesToSubscribeTo, quotesToPoll } =
    usePartitionQuotesByStateCheckType({
      quotes,
      getCashuAccount,
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
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  const pendingQuotes = usePendingCashuReceiveQuotes();

  useOnMintQuoteStateChange({
    quotes: pendingQuotes,
    onPaid: (account, quote) => {
      // TODO: this should probaby trigger mutation that will then call related service method. That way mutation will be responsible for errors and retries.
      cashuReceiveQuoteService.completeReceive(account, quote);
    },
    onIssued: (account, quote) => {
      // TODO: this should probaby trigger mutation that will then call related service method. That way mutation will be responsible for errors and retries.
      cashuReceiveQuoteService.completeReceive(account, quote);
    },
    onExpired: (quote) => {
      // TODO: this should probaby trigger mutation that will then call related service method. That way mutation will be responsible for errors and retries.
      cashuReceiveQuoteService.expire(quote);
    },
  });
}
