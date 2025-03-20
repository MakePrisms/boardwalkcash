import {
  CashuMint,
  CashuWallet,
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
import { type Currency, Money } from '~/lib/money';
import type { Account, CashuAccount } from '../accounts/account';
import { accountsQueryKey } from '../accounts/account-hooks';
import {
  type BoardwalkDbCashuReceiveQuote,
  boardwalkDb,
} from '../boardwalk-db/database';
import { type CashuCryptography, useCashuCryptography } from '../shared/cashu';
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
       * Counter value for the keyset at the time of quote creation.
       */
      keysetCounter: number;
      /**
       * Number of blinded messages generated for this quote.
       */
      numberOfBlindedMessages: number;
    }
);

const cashuReceiveQuoteRepository = new CashuReceiveQuoteRepository(
  boardwalkDb,
);

const createCashuReceiveQuote = async (
  cryptography: CashuCryptography,
  userId: string,
  account: CashuAccount,
  amount: Money,
  description?: string,
) => {
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const moneyUnit = cashuUnit === 'usd' ? 'cent' : 'sat';

  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
    unit: cashuUnit,
  });

  const mintQuoteResponse = await wallet.createMintQuote(
    amount.toNumber(moneyUnit),
    description,
  );

  const expiresAt = new Date(mintQuoteResponse.expiry * 1000).toISOString();

  const cashuReceiveQuote = await cashuReceiveQuoteRepository.create(
    {
      accountId: account.id,
      userId,
      amount,
      unit: cashuUnit,
      description,
      quoteId: mintQuoteResponse.quote,
      expiresAt,
      state: mintQuoteResponse.state as CashuReceiveQuote['state'],
      paymentRequest: mintQuoteResponse.request,
    },
    {
      encryptData: cryptography.encryptData,
      decryptData: cryptography.decryptData,
    },
  );

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
  cryptography: CashuCryptography,
  account: CashuAccount,
  wallet: CashuWallet,
  quote: CashuReceiveQuote,
) => {
  const keys = await wallet.getKeys(quote.keysetId);
  const counter = account.keysetCounters[wallet.keysetId] ?? 0;
  const seed = await cryptography.getSeed(`m/44'/0'/0'/0/0`); // TODO: see which derivation path to use
  const outputData = OutputData.createDeterministicData(
    quote.amount,
    seed,
    counter,
    keys,
  );

  const { updatedQuote, updatedAccount } =
    await cashuReceiveQuoteRepository.processPayment(
      {
        quoteId: quote.id,
        quoteVersion: quote.version,
        keysetId: wallet.keysetId,
        keysetCounter: counter,
        numberOfBlindedMessages: outputData.length,
        accountVersion: account.version,
      },
      {
        encryptData: cryptography.encryptData,
        decryptData: cryptography.decryptData,
      },
    );

  const mintedProofs = await mintProofs(wallet, updatedQuote, outputData);
  const allProofs = [...updatedAccount.proofs, ...mintedProofs];

  await cashuReceiveQuoteRepository.completeReceive(
    {
      quoteId: quote.id,
      quoteVersion: updatedQuote.version,
      proofs: allProofs,
      accountVersion: updatedAccount.version,
    },
    {
      encryptData: cryptography.encryptData,
      decryptData: cryptography.decryptData,
    },
  );
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

  return useMutation({
    mutationKey: ['create-cashu-receive-quote'],
    scope: {
      id: 'create-cashu-receive-quote',
    },
    mutationFn: ({ account, amount, description }: CreateProps) =>
      createCashuReceiveQuote(
        cashuCryptography,
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
  cryptography: CashuCryptography,
  account: CashuAccount,
  quote: CashuReceiveQuote,
) {
  if (quote.accountId !== account.id) {
    throw new Error('Quote account id does not match account id');
  }

  const seed = await cryptography.getSeed(`m/44'/0'/0'/0/0`); // TODO: see which derivation path to use
  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
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
    await mintCashuTokens(cryptography, account, wallet, quote);
  }
}

export function useTrackAllCashuReceiveQuotes() {
  const userRef = useUserRef();
  const queryClient = useQueryClient();
  const [trackedQuotes, setTrackedQuotes] = useState<CashuReceiveQuote[]>([]);
  const cashuCryptography = useCashuCryptography();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ['cashu-receive-quotes', userRef.current.id],
    queryFn: () =>
      cashuReceiveQuoteRepository.getAll(userRef.current.id, {
        encryptData: cashuCryptography.encryptData,
        decryptData: cashuCryptography.decryptData,
      }),
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

        await checkCashuReceiveQuote(cashuCryptography, account, quote);
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
              prev.filter((account) => account.id !== payload.old.id),
            );
            // TODO: toast is here only temporarily. Later we should be probably be showing notifications based on the history items not quotes.
            if (
              deletedQuote?.state === 'PAID' &&
              deletedQuote?.amount &&
              deletedQuote?.currency
            ) {
              queryClient.invalidateQueries({
                queryKey: [accountsQueryKey, userRef.current.id],
              });
              const money = new Money({
                amount: deletedQuote.amount,
                currency: deletedQuote.currency,
              });
              toast({
                title: 'Payment Received',
                description: `You received ${money.toLocaleString()}`,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            const addedQuote = await CashuReceiveQuoteRepository.toQuote(
              payload.new,
              cashuCryptography.decryptData,
            );
            setTrackedQuotes((prev) => [...prev, addedQuote]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuote = await CashuReceiveQuoteRepository.toQuote(
              payload.new,
              cashuCryptography.decryptData,
            );
            queryClient.setQueryData(
              ['cashu-receive-quote', payload.new.id],
              updatedQuote,
            );
            setTrackedQuotes((prev) =>
              prev.map((account) =>
                account.id === payload.new.id ? updatedQuote : account,
              ),
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
