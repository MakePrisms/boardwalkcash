import type { MeltQuoteResponse } from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type Big from 'big.js';
import { useCallback, useEffect, useMemo } from 'react';
import { getCashuWallet } from '~/lib/cashu';
import type { Money } from '~/lib/money';
import { useLatest } from '~/lib/use-latest';
import type { CashuAccount } from '../accounts/account';
import { useAccountsCache } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuSendQuote,
  boardwalkDb,
} from '../boardwalk-db/database';
import { useCashuCryptography } from '../shared/cashu';
import { useUserRef } from '../user/user-hooks';
import type { CashuSendQuote } from './cashu-send-quote';
import {
  CashuSendQuoteRepository,
  useCashuSendQuoteRepository,
} from './cashu-send-quote-repository';
import {
  type SendQuoteRequest,
  useCashuSendQuoteService,
} from './cashu-send-quote-service';

// Query that tracks the "active" cashu send quote. Active one is the one that user created in current browser session.
// We want to track active send quote even after it is completed or expired which is why we can't use unresolved send quotes query.
// Unresolved send quotes query is used for active unresolved quotes plus "background" unresolved quotes. "Background" quotes are send quotes
// that were created in previous browser sessions.
const cashuSendQuoteQueryKey = 'cashu-send-quote';
// Query that tracks all unresolved cashu send quotes (active and background ones).
const unresolvedCashuSendQuotesQueryKey = 'unresolved-cashu-send-quotes';

class CashuSendQuoteCache {
  constructor(private readonly queryClient: QueryClient) {}

  get(quoteId: string) {
    return this.queryClient.getQueryData<CashuSendQuote>([
      cashuSendQuoteQueryKey,
      quoteId,
    ]);
  }

  add(quote: CashuSendQuote) {
    this.queryClient.setQueryData<CashuSendQuote>(
      [cashuSendQuoteQueryKey, quote.id],
      quote,
    );
  }

  updateIfExists(quote: CashuSendQuote) {
    this.queryClient.setQueryData<CashuSendQuote>(
      [cashuSendQuoteQueryKey, quote.id],
      (curr) => (curr ? quote : undefined),
    );
  }
}

class UnresolvedCashuSendQuotesCache {
  constructor(private readonly queryClient: QueryClient) {}

  add(quote: CashuSendQuote) {
    this.queryClient.setQueryData<CashuSendQuote[]>(
      [unresolvedCashuSendQuotesQueryKey, quote.userId],
      (curr) => [...(curr ?? []), quote],
    );
  }

  update(quote: CashuSendQuote) {
    this.queryClient.setQueryData<CashuSendQuote[]>(
      [unresolvedCashuSendQuotesQueryKey, quote.userId],
      (curr) => curr?.map((q) => (q.id === quote.id ? quote : q)),
    );
  }

  remove(quote: CashuSendQuote) {
    this.queryClient.setQueryData<CashuSendQuote[]>(
      [unresolvedCashuSendQuotesQueryKey, quote.userId],
      (curr) => curr?.filter((q) => q.id !== quote.id),
    );
  }
}

function useCashuSendQuoteCache() {
  const queryClient = useQueryClient();
  return useMemo(() => new CashuSendQuoteCache(queryClient), [queryClient]);
}

export function useCreateCashuSendQuote() {
  const cashuSendQuoteService = useCashuSendQuoteService();

  return useMutation({
    mutationKey: ['create-cashu-send-quote'],
    scope: {
      id: 'create-cashu-send-quote',
    },
    mutationFn: ({
      account,
      amount,
      paymentRequest,
      exchangeRate,
    }: {
      account: CashuAccount;
      paymentRequest: string;
      amount?: Money;
      exchangeRate?: Big;
    }) =>
      cashuSendQuoteService.getLightningQuote({
        account,
        amount,
        paymentRequest,
        exchangeRate,
      }),
    retry: 1,
  });
}

export function useInitiateCashuSendQuote({
  onError,
}: { onError: (error: Error) => void }) {
  const userRef = useUserRef();
  const cashuSendQuoteService = useCashuSendQuoteService();
  const cashuSendQuoteCache = useCashuSendQuoteCache();

  return useMutation({
    mutationKey: ['initiate-cashu-send-quote'],
    scope: {
      id: 'initiate-cashu-send-quote',
    },
    mutationFn: ({
      account,
      sendQuote,
    }: { account: CashuAccount; sendQuote: SendQuoteRequest }) =>
      cashuSendQuoteService.createSendQuote({
        userId: userRef.current.id,
        account,
        sendQuote,
      }),
    onSuccess: (data) => {
      cashuSendQuoteCache.add(data);
    },
    onError: onError,
    retry: 1,
  });
}

type UseCashuSendQuoteProps = {
  sendQuoteId?: string;
  onPending?: (send: CashuSendQuote) => void;
  onPaid?: (send: CashuSendQuote) => void;
  onExpired?: (send: CashuSendQuote) => void;
};

type UseCashuSendQuoteResponse =
  | {
      status: 'LOADING';
      quote?: undefined;
    }
  | {
      status: CashuSendQuote['state'];
      quote: CashuSendQuote;
    };

export function useCashuSendQuote({
  sendQuoteId,
  onPending,
  onPaid,
  onExpired,
}: UseCashuSendQuoteProps): UseCashuSendQuoteResponse {
  const enabled = !!sendQuoteId;
  const onPendingRef = useLatest(onPending);
  const onPaidRef = useLatest(onPaid);
  const onExpiredRef = useLatest(onExpired);
  const cache = useCashuSendQuoteCache();

  const { data } = useQuery({
    queryKey: [cashuSendQuoteQueryKey, sendQuoteId],
    queryFn: () => cache.get(sendQuoteId ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });

  useEffect(() => {
    if (!data) return;

    if (data.state === 'PENDING') {
      onPendingRef.current?.(data);
    } else if (data.state === 'PAID') {
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

function useOnCashuSendQuoteChange({
  onCreated,
  onUpdated,
}: {
  onCreated: (send: CashuSendQuote) => void;
  onUpdated: (send: CashuSendQuote) => void;
}) {
  const cashuCryptography = useCashuCryptography();
  const onCreatedRef = useLatest(onCreated);
  const onUpdatedRef = useLatest(onUpdated);

  useEffect(() => {
    const channel = boardwalkDb
      .channel('cashu-send-quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'cashu_send_quotes',
        },
        async (
          payload: RealtimePostgresChangesPayload<BoardwalkDbCashuSendQuote>,
        ) => {
          if (payload.eventType === 'INSERT') {
            const addedQuote = await CashuSendQuoteRepository.toSend(
              payload.new,
              cashuCryptography.decrypt,
            );
            onCreatedRef.current(addedQuote);
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuote = await CashuSendQuoteRepository.toSend(
              payload.new,
              cashuCryptography.decrypt,
            );
            onUpdatedRef.current(updatedQuote);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [cashuCryptography]);
}

function useUnresolvedCashuSendQuotes() {
  const queryClient = useQueryClient();
  const cashuSendQuoteRepository = useCashuSendQuoteRepository();
  const userRef = useUserRef();
  const unresolvedSendQuotesCache = useMemo(
    () => new UnresolvedCashuSendQuotesCache(queryClient),
    [queryClient],
  );
  const cashuSendQuoteCache = useCashuSendQuoteCache();

  const { data } = useQuery({
    queryKey: [unresolvedCashuSendQuotesQueryKey, userRef.current.id],
    queryFn: () => cashuSendQuoteRepository.getUnresolved(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
    throwOnError: true,
  });

  useOnCashuSendQuoteChange({
    onCreated: (send) => {
      unresolvedSendQuotesCache.add(send);
    },
    onUpdated: (send) => {
      cashuSendQuoteCache.updateIfExists(send);

      if (['UNPAID', 'PENDING'].includes(send.state)) {
        unresolvedSendQuotesCache.update(send);
      } else {
        unresolvedSendQuotesCache.remove(send);
      }
    },
  });

  return data ?? [];
}

type OnMeltQuoteStateChangeProps = {
  sendQuotes: CashuSendQuote[];
  onUnpaid: (
    account: CashuAccount,
    quote: CashuSendQuote,
    meltQuote: MeltQuoteResponse,
  ) => void;
  onPending: (
    account: CashuAccount,
    quote: CashuSendQuote,
    meltQuote: MeltQuoteResponse,
  ) => void;
  onPaid: (
    account: CashuAccount,
    send: CashuSendQuote,
    meltQuote: MeltQuoteResponse,
  ) => void;
  onExpired: (
    account: CashuAccount,
    quote: CashuSendQuote,
    meltQuote: MeltQuoteResponse,
  ) => void;
};

function useOnMeltQuoteStateChange({
  sendQuotes,
  onUnpaid,
  onPending,
  onPaid,
  onExpired,
}: OnMeltQuoteStateChangeProps) {
  const accountsCache = useAccountsCache();
  const onUnpaidRef = useLatest(onUnpaid);
  const onPendingRef = useLatest(onPending);
  const onPaidRef = useLatest(onPaid);
  const onExpiredRef = useLatest(onExpired);

  const handleMeltQuoteUpdate = useCallback(
    async (meltQuote: MeltQuoteResponse) => {
      console.debug('Melt quote updated', meltQuote);

      const relatedSendQuote = sendQuotes.find(
        (sendQuote) => sendQuote.quoteId === meltQuote.quote,
      );

      if (!relatedSendQuote) {
        console.warn('No related send quote found for the melt quote');
        return;
      }

      const account = await accountsCache.getLatest(relatedSendQuote.accountId);
      if (!account || account.type !== 'cashu') {
        throw new Error(
          `Account not found for id: ${relatedSendQuote.accountId}`,
        );
      }

      const expiresAt = new Date(relatedSendQuote.expiresAt);
      const now = new Date();

      if (
        meltQuote.state === 'UNPAID' &&
        expiresAt < now &&
        relatedSendQuote.state !== 'EXPIRED'
      ) {
        // TODO: do we get notified by the socket when the quote is expired?
        // If not we need to find another way.
        onExpiredRef.current(account, relatedSendQuote, meltQuote);
      } else if (
        meltQuote.state === 'PAID' &&
        relatedSendQuote.state !== 'PAID'
      ) {
        onPaidRef.current(account, relatedSendQuote, meltQuote);
      } else if (
        meltQuote.state === 'PENDING' &&
        relatedSendQuote.state !== 'PENDING'
      ) {
        onPendingRef.current(account, relatedSendQuote, meltQuote);
      } else if (
        meltQuote.state === 'UNPAID' &&
        relatedSendQuote.state === 'UNPAID'
      ) {
        onUnpaidRef.current(account, relatedSendQuote, meltQuote);
      }
    },
    [sendQuotes, accountsCache],
  );

  useEffect(() => {
    if (sendQuotes.length === 0) return;

    const subcribeToMeltQuoteUpdates = async (quotes: CashuSendQuote[]) => {
      const quotesByMint = quotes.reduce<Record<string, string[]>>(
        (acc, quote) => {
          const account = accountsCache.get(quote.accountId);
          if (!account || account.type !== 'cashu') {
            throw new Error(
              `Cashu account not found for id: ${quote.accountId}`,
            );
          }
          const existingQuotesForMint = acc[account.mintUrl] ?? [];
          acc[account.mintUrl] = existingQuotesForMint.concat(quote.quoteId);
          return acc;
        },
        {},
      );

      const subscriptions = Object.entries(quotesByMint).map(
        ([mintUrl, quotes]) => {
          const wallet = getCashuWallet(mintUrl);
          return wallet.onMeltQuoteUpdates(
            quotes,
            handleMeltQuoteUpdate,
            // TODO: what should we do here on error?
            (error) =>
              console.error('Melt quote updates socket error', {
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

    subcribeToMeltQuoteUpdates(sendQuotes);
  }, [sendQuotes, accountsCache, handleMeltQuoteUpdate]);
}

export function useTrackUnresolvedCashuSendQuotes() {
  const cashuSendService = useCashuSendQuoteService();
  const unresolvedSendQuotes = useUnresolvedCashuSendQuotes();

  useOnMeltQuoteStateChange({
    sendQuotes: unresolvedSendQuotes,
    onUnpaid: (account, send, meltQuote) => {
      // TODO: this should probaby trigger mutation that will then call triggerSend. That way mutation will be responsible for errors and retries.
      cashuSendService.initiateSend(account, send, meltQuote);
    },
    onPending: (_, send) => {
      // TODO: this should probaby trigger mutation that will then call related service method. That way mutation will be responsible for errors and retries.
      cashuSendService.markSendQuoteAsPending(send);
    },
    onExpired: (account, send) => {
      // TODO: this should probaby trigger mutation that will then call expire. That way mutation will be responsible for errors and retries.
      cashuSendService.expireSendQuote(account, send);
    },
    onPaid: (account, send, meltQuote) => {
      // TODO: this should probaby trigger mutation that will then call expire. That way mutation will be responsible for errors and retries.
      cashuSendService.completeSendQuote(account, send, meltQuote);
    },
  });
}
