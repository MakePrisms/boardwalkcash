import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Proof,
} from '@cashu/cashu-ts';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useIsomorphicLayoutEffect } from 'usehooks-ts';
import { useToast } from '~/hooks/use-toast';
import { getCashuWallet } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import type { Account, CashuAccount } from '../accounts/account';
import { accountsQueryKey } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuReceiveQuote,
  boardwalkDb,
} from '../boardwalk-db/database';
import { type CashuCryptography, useCashuCryptography } from '../shared/cashu';
import { getDefaultUnit } from '../shared/currencies';
import { useUserRef } from '../user/user-hooks';
import { CashuReceiveQuoteRepository } from './cashu-receive-quote-repository';

export type CashuReceiveQuote = {
  id: string;
  /**
   * ID of the user that the quote belongs to.
   */
  userId: string;
  /**
   * ID of the Boardwalk account that the quote belongs to.
   */
  accountId: string;
  /**
   * ID of the mint quote.
   * Once the quote is paid, the mint quote id is used to mint the tokens.
   */
  quoteId: string;
  /**
   * Amount of the quote.
   */
  amount: number;
  /**
   * Currency of the quote.
   */
  currency: Currency;
  /**
   * Cashu unit of the amount.
   */
  unit: string;
  description?: string;
  createdAt: string;
  expiresAt: string;
  state: 'UNPAID' | 'PAID';
  /**
   * Payment request for the quote.
   */
  paymentRequest: string;
  /**
   * Row version.
   * Used for optimistic locking.
   */
  version: number;
} & (
  | {
      state: 'UNPAID';
      keysetId: undefined; // TODO: is there a better way to type this?
      keysetCounter: undefined;
      numberOfBlindedMessages: undefined;
    }
  | {
      state: 'PAID';
      /**
       * ID of the keyset used to create the blinded messages.
       */
      keysetId: string;
      /**
       * Counter value for the keyset at the time the time of quote payment.
       */
      keysetCounter: number;
      /**
       * Number of blinded messages generated for this quote.
       */
      numberOfBlindedMessages: number;
    }
);

const createCashuReceiveQuote = async (
  cashuReceiveQuoteRepository: CashuReceiveQuoteRepository,
  userId: string,
  account: CashuAccount,
  amount: Money,
  description?: string,
) => {
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const moneyUnit = cashuUnit === 'usd' ? 'cent' : 'sat';

  const wallet = getCashuWallet(account.mintUrl, {
    unit: cashuUnit,
  });

  const mintQuoteResponse = await wallet.createMintQuote(
    amount.toNumber(moneyUnit),
    description,
  );

  const expiresAt = new Date(mintQuoteResponse.expiry * 1000).toISOString();

  const cashuReceiveQuote = await cashuReceiveQuoteRepository.create({
    accountId: account.id,
    userId,
    amount,
    unit: cashuUnit,
    description,
    quoteId: mintQuoteResponse.quote,
    expiresAt,
    state: mintQuoteResponse.state as CashuReceiveQuote['state'],
    paymentRequest: mintQuoteResponse.request,
  });

  return cashuReceiveQuote;
};

const mintProofs = async (
  wallet: CashuWallet,
  quote: CashuReceiveQuote,
  outputData: OutputData[],
): Promise<Proof[]> => {
  if (quote.state === 'UNPAID') {
    throw new Error('Cannot mint proofs for unpaid quote');
  }

  try {
    const proofs = await wallet.mintProofs(quote.amount, quote.quoteId, {
      keysetId: quote.keysetId,
      outputData,
    });
    return proofs;
  } catch (error) {
    if (
      error instanceof MintOperationError &&
      // biome-ignore lint/suspicious/noDoubleEquals: I am not sure if the code is number or string so == will work for both
      (error.code == 20002 || error.code == 11000)
    ) {
      try {
        const { proofs } = await wallet.restore(
          quote.keysetCounter,
          quote.numberOfBlindedMessages,
          {
            keysetId: quote.keysetId,
          },
        );
        return proofs;
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
    throw error;
  }
};

const mintCashuTokens = async (
  cashuReceiveQuoteRepository: CashuReceiveQuoteRepository,
  cryptography: CashuCryptography,
  account: CashuAccount,
  wallet: CashuWallet,
  quote: CashuReceiveQuote,
) => {
  const keys = await wallet.getKeys(quote.keysetId);
  const counter = account.keysetCounters[wallet.keysetId] ?? 0;
  const seed = await cryptography.getSeed();
  const outputData = OutputData.createDeterministicData(
    quote.amount,
    seed,
    counter,
    keys,
  );

  const { updatedQuote, updatedAccount } =
    await cashuReceiveQuoteRepository.processPayment({
      quoteId: quote.id,
      quoteVersion: quote.version,
      keysetId: wallet.keysetId,
      keysetCounter: counter,
      numberOfBlindedMessages: outputData.length,
      accountVersion: account.version,
    });

  const mintedProofs = await mintProofs(wallet, updatedQuote, outputData);
  const allProofs = [...updatedAccount.proofs, ...mintedProofs];

  await cashuReceiveQuoteRepository.completeReceive({
    quoteId: quote.id,
    quoteVersion: updatedQuote.version,
    proofs: allProofs,
    accountVersion: updatedAccount.version,
  });
};

type CreateProps = {
  account: CashuAccount;
  amount: Money;
  description?: string;
};

export function useCreateCashuReceiveQuote() {
  const userRef = useUserRef();
  const cashuCryptography = useCashuCryptography();
  const queryClient = useQueryClient();
  const cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
    boardwalkDb,
    cashuCryptography,
  );

  return useMutation({
    mutationKey: ['create-cashu-receive-quote'],
    scope: {
      id: 'create-cashu-receive-quote',
    },
    mutationFn: ({ account, amount, description }: CreateProps) =>
      createCashuReceiveQuote(
        cashuReceiveQuoteRepository,
        userRef.current.id,
        account,
        amount,
        description,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(['cashu-receive-quote', data.id], data);
    },
    retry: 1,
  });
}

async function checkCashuReceiveQuote(
  cashuReceiveQuoteRepository: CashuReceiveQuoteRepository,
  cryptography: CashuCryptography,
  account: CashuAccount,
  quote: CashuReceiveQuote,
) {
  if (quote.accountId !== account.id) {
    throw new Error('Quote account id does not match account id');
  }

  const seed = await cryptography.getSeed();
  const wallet = getCashuWallet(account.mintUrl, {
    unit: quote.unit,
    bip39seed: seed,
  });

  const mintQuoteResponse = await wallet.checkMintQuote(quote.quoteId);
  const expiresAt = new Date(mintQuoteResponse.expiry * 1000);
  const now = new Date();

  if (mintQuoteResponse.state === 'UNPAID' && expiresAt < now) {
    await cashuReceiveQuoteRepository.expire({
      id: quote.id,
      version: quote.version,
    });
  } else if (
    mintQuoteResponse.state === 'PAID' ||
    mintQuoteResponse.state === 'ISSUED'
  ) {
    await mintCashuTokens(
      cashuReceiveQuoteRepository,
      cryptography,
      account,
      wallet,
      quote,
    );
  }
}

export function useTrackAllCashuReceiveQuotes() {
  const userRef = useUserRef();
  const queryClient = useQueryClient();
  const [trackedQuotes, setTrackedQuotes] = useState<CashuReceiveQuote[]>([]);
  const cashuCryptography = useCashuCryptography();
  const { toast } = useToast();
  const cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
    boardwalkDb,
    cashuCryptography,
  );

  const { data } = useQuery({
    queryKey: ['cashu-receive-quotes', userRef.current.id],
    queryFn: () => cashuReceiveQuoteRepository.getAll(userRef.current.id),
    gcTime: 0,
    throwOnError: true,
  });

  useEffect(() => {
    if (data) {
      setTrackedQuotes(data);
    }
  }, [data]);

  useQueries({
    queries: trackedQuotes.map((quote) => ({
      queryKey: ['track-cashu-receive-quote', quote.id],
      queryFn: async () => {
        const accounts = queryClient.getQueryData<Account[]>([
          accountsQueryKey,
          userRef.current.id,
        ]);
        const account = accounts?.find((acc) => acc.id === quote.accountId);
        if (!account || account.type !== 'cashu') {
          throw new Error(`Account not found for id: ${quote.accountId}`);
        }

        await checkCashuReceiveQuote(
          cashuReceiveQuoteRepository,
          cashuCryptography,
          account,
          quote,
        );
      },
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    })),
  });

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
        async (
          payload: RealtimePostgresChangesPayload<BoardwalkDbCashuReceiveQuote>,
        ) => {
          if (payload.eventType === 'DELETE') {
            const deletedQuote = queryClient.getQueryData<CashuReceiveQuote>([
              'cashu-receive-quote',
              payload.old.id,
            ]);
            setTrackedQuotes((prev) =>
              prev.filter((q) => q.id !== payload.old.id),
            );
            // TODO: toast is here only temporarily. Later we should be probably be showing notifications based on the history items not quotes.
            if (deletedQuote?.state === 'PAID') {
              queryClient.invalidateQueries({
                queryKey: [accountsQueryKey, userRef.current.id],
              });
              const unit = getDefaultUnit(deletedQuote.currency);
              const money = new Money({
                amount: deletedQuote.amount,
                currency: deletedQuote.currency,
                unit,
              });
              toast({
                title: 'Payment Received',
                description: `You received ${money.toLocaleString({ unit })}`,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            const addedQuote = await CashuReceiveQuoteRepository.toQuote(
              payload.new,
              cashuCryptography.decrypt,
            );
            setTrackedQuotes((prev) => [...prev, addedQuote]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuote = await CashuReceiveQuoteRepository.toQuote(
              payload.new,
              cashuCryptography.decrypt,
            );
            queryClient.setQueryData(
              ['cashu-receive-quote', payload.new.id],
              updatedQuote,
            );
            setTrackedQuotes((prev) =>
              prev.map((q) => (q.id === payload.new.id ? updatedQuote : q)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, cashuCryptography, toast]);
}

export function useCashuReceiveQuote(quoteId: string) {
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<CashuReceiveQuote | undefined>(() => {
    return queryClient.getQueryData<CashuReceiveQuote>([
      'cashu-receive-quote',
      quoteId,
    ]);
  });

  const { data } = useQuery({
    queryKey: ['cashu-receive-quote', quoteId],
    queryFn: () =>
      queryClient.getQueryData<CashuReceiveQuote>([
        'cashu-receive-quote',
        quoteId,
      ]),
    staleTime: Number.POSITIVE_INFINITY,
  });

  useIsomorphicLayoutEffect(() => {
    if (data) {
      setQuote(data);
    }
  }, [data]);

  return {
    isPaid: data?.state === 'PAID',
    isExpired:
      data?.state === 'UNPAID' &&
      data?.expiresAt &&
      new Date(data.expiresAt) < new Date(),
    quote,
  };
}
