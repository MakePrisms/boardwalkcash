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
import { getCashuWallet } from '~/lib/cashu';
import type { Money } from '~/lib/money';
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

type OnMintQuoteStateChangeProps = {
  quotes: CashuReceiveQuote[];
  onExpired: (quote: CashuReceiveQuote) => Promise<void>;
  onPaid: (account: CashuAccount, quote: CashuReceiveQuote) => Promise<void>;
  onIssued: (account: CashuAccount, quote: CashuReceiveQuote) => Promise<void>;
};

const useOnMintQuoteStateChange = ({
  quotes,
  onExpired,
  onPaid,
  onIssued,
}: OnMintQuoteStateChangeProps) => {
  const accountsCache = useAccountsCache();

  useQueries({
    queries: quotes.map((quote) => ({
      queryKey: ['mint-quote', quote.id],
      queryFn: async () => {
        try {
          const account = await accountsCache.getLatest(quote.accountId);
          if (!account || account.type !== 'cashu') {
            throw new Error(`Account not found for id: ${quote.accountId}`);
          }

          const wallet = getCashuWallet(account.mintUrl);

          const mintQuoteResponse = await wallet.checkMintQuote(quote.quoteId);
          const expiresAt = new Date(quote.expiresAt);
          const now = new Date();

          if (
            mintQuoteResponse.state === 'UNPAID' &&
            expiresAt < now &&
            quote.state !== 'EXPIRED'
          ) {
            await onExpired(quote);
          } else if (
            mintQuoteResponse.state === 'PAID' &&
            quote.state !== 'PAID'
          ) {
            await onPaid(account, quote);
          } else if (
            mintQuoteResponse.state === 'ISSUED' &&
            quote.state !== 'COMPLETED'
          ) {
            await onIssued(account, quote);
          }

          return mintQuoteResponse;
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    })),
  });
};

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

export function useTrackPendingCashuReceiveQuotes() {
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  const pendingQuotes = usePendingCashuReceiveQuotes();

  useOnMintQuoteStateChange({
    quotes: pendingQuotes,
    onExpired: (quote) => cashuReceiveQuoteService.expire(quote),
    onPaid: (account, quote) =>
      cashuReceiveQuoteService.completeReceive(account, quote),
    onIssued: (account, quote) =>
      cashuReceiveQuoteService.completeReceive(account, quote),
  });
}
