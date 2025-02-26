import {
  CashuMint,
  CashuWallet,
  type Keys,
  type MintKeyset,
  type MintQuoteResponse as MintQuote,
  MintQuoteState,
  type Proof,
} from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import { create, useStore } from 'zustand';
import {
  PageBackButton,
  PageContent,
  PageHeaderTitle,
} from '~/components/page';
import { PageHeader } from '~/components/page';
import { Card, CardContent } from '~/components/ui/card';
import {
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/ui/carousel';
import { Carousel, CarouselContent } from '~/components/ui/carousel';
import { safeJsonParse } from '~/lib/json';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';
import { LoadingScreen } from '../loading/LoadingScreen';
import { getCashuRequest } from './reusable-payment-request';

// Need to make sure that the counter is used for this same mint quote every time
// Need to make sure that the counter is incremented by the number of proofs minted

const getUnitFromMoney = (amount: Money) => {
  if (amount.currency === 'USD') {
    return 'usd';
  }
  if (amount.currency === 'BTC') {
    return 'sat';
  }
  throw new Error('Invalid currency');
};

// ==== START COPIED FROM CASHU-TS ====

/**
 * Splits the amount into denominations of the provided @param keyset
 * @param value amount to split
 * @param keyset keys to look up split amounts
 * @param split? optional custom split amounts
 * @param order? optional order for split amounts (default: "asc")
 * @returns Array of split amounts
 * @throws Error if @param split amount is greater than @param value amount
 */
export function splitAmount(
  value: number,
  keyset: Keys,
  split?: Array<number>,
  order?: 'desc' | 'asc',
): Array<number> {
  let remainingValue = value;
  const amounts = split ? [...split] : [];

  if (amounts.length > 0) {
    if (amounts.reduce((a: number, b: number) => a + b, 0) > value) {
      throw new Error(
        `Split is greater than total amount: ${amounts.reduce(
          (a: number, b: number) => a + b,
          0,
        )} > ${value}`,
      );
    }
    amounts.forEach((amt: number) => {
      if (!hasCorrespondingKey(amt, keyset)) {
        throw new Error(
          'Provided amount preferences do not match the amounts of the mint keyset.',
        );
      }
    });
    remainingValue -= amounts.reduce(
      (curr: number, acc: number) => curr + acc,
      0,
    );
  }

  const sortedKeyAmounts = getKeysetAmounts(keyset);
  sortedKeyAmounts.forEach((amt: number) => {
    const q = Math.floor(remainingValue / amt);
    for (let i = 0; i < q; ++i) amounts.push(amt);
    remainingValue %= amt;
  });
  return amounts.sort((a, b) => (order === 'desc' ? b - a : a - b));
}

/**
 * Creates a list of amounts to keep based on the proofs we have and the proofs we want to reach.
 * @param proofsWeHave complete set of proofs stored (from current mint)
 * @param amountToKeep amount to keep
 * @param keys keys of current keyset
 * @param targetCount the target number of proofs to reach
 * @returns an array of amounts to keep
 */
export function getKeepAmounts(
  proofsWeHave: Array<Proof>,
  amountToKeep: number,
  keys: Keys,
  targetCount: number,
): Array<number> {
  // determines amounts we need to reach the targetCount for each amount based on the amounts of the proofs we have
  // it tries to select amounts so that the proofs we have and the proofs we want reach the targetCount
  const amountsWeWant: Array<number> = [];
  const amountsWeHave = proofsWeHave.map((p: Proof) => p.amount);
  const sortedKeyAmounts = getKeysetAmounts(keys, 'asc');
  sortedKeyAmounts.forEach((amt) => {
    const countWeHave = amountsWeHave.filter((a) => a === amt).length;
    const countWeWant = Math.max(targetCount - countWeHave, 0);
    for (let i = 0; i < countWeWant; ++i) {
      if (amountsWeWant.reduce((a, b) => a + b, 0) + amt > amountToKeep) {
        break;
      }
      amountsWeWant.push(amt);
    }
  });
  // use splitAmount to fill the rest between the sum of amountsWeHave and amountToKeep
  const amountDiff = amountToKeep - amountsWeWant.reduce((a, b) => a + b, 0);
  if (amountDiff) {
    const remainingAmounts = splitAmount(amountDiff, keys);
    remainingAmounts.forEach((amt: number) => {
      amountsWeWant.push(amt);
    });
  }
  const sortedAmountsWeWant = amountsWeWant.sort((a, b) => a - b);
  return sortedAmountsWeWant;
}

/**
 * returns the amounts in the keyset sorted by the order specified
 * @param keyset to search in
 * @param order order to sort the amounts in
 * @returns the amounts in the keyset sorted by the order specified
 */
export function getKeysetAmounts(
  keyset: Keys,
  order: 'desc' | 'asc' = 'desc',
): Array<number> {
  if (order === 'desc') {
    return Object.keys(keyset)
      .map((k: string) => Number.parseInt(k))
      .sort((a: number, b: number) => b - a);
  }
  return Object.keys(keyset)
    .map((k: string) => Number.parseInt(k))
    .sort((a: number, b: number) => a - b);
}

/**
 * Checks if the provided amount is in the keyset.
 * @param amount amount to check
 * @param keyset to search in
 * @returns true if the amount is in the keyset, false otherwise
 */
export function hasCorrespondingKey(amount: number, keyset: Keys): boolean {
  return amount in keyset;
}

// === END COPIED FROM CASHU-TS ==== 

const isAlreadyIssuedError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (('code' in error && error.code === '20002') ||
      ('detail' in error && (error.detail as string).includes('already')) ||
      ('message' in error && (error.message as string).includes('already')))
  );
};

const STORAGE_KEYS = {
  KEYSETS: 'keysets',
  KEYSET_COUNTERS: 'keyset-counters',
  PROOFS: 'proofs',
} as const;
type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function loadFromStorage<T>(key: StorageKey, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  const stored = safeJsonParse<T>(
    localStorage.getItem(key) ?? JSON.stringify(defaultValue),
  );
  return stored.success ? stored.data : defaultValue;
}

function saveToStorage<T>(key: StorageKey, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} to storage:`, error);
  }
}

type KeysetCounter = {
  /** The keysetId that this counter is for */
  id: string;
  /** The counter to derive secrets deterministically */
  counter: number;
};

type KeysetStore = {
  keysets: MintKeyset[];
  counters: KeysetCounter[];
  addKeyset: (keyset: MintKeyset, counter?: number) => Promise<void>;
  getKeyset: (keysetId: string) => MintKeyset | undefined;
  getKeysetCounter: (keysetId: string) => KeysetCounter | undefined;
  incrementKeysetCounter: (keysetId: string, by: number) => void;
};

const keysetStore = create<KeysetStore>((set, get) => ({
  keysets: loadFromStorage<MintKeyset[]>(STORAGE_KEYS.KEYSETS, []),
  counters: loadFromStorage<KeysetCounter[]>(STORAGE_KEYS.KEYSET_COUNTERS, []),
  addKeyset: async (keyset, counter) => {
    const newKeysets = [...get().keysets, keyset];
    const newCounters = [
      ...get().counters,
      { id: keyset.id, counter: counter ?? 0 },
    ];
    set({ keysets: newKeysets, counters: newCounters });
    saveToStorage<MintKeyset[]>(STORAGE_KEYS.KEYSETS, newKeysets);
    saveToStorage<KeysetCounter[]>(STORAGE_KEYS.KEYSET_COUNTERS, newCounters);
  },
  getKeyset: (keysetId) => {
    return get().keysets.find((k) => k.id === keysetId);
  },
  getKeysetCounter: (keysetId) => {
    return get().counters.find((c) => c.id === keysetId);
  },
  incrementKeysetCounter: (keysetId, by) => {
    const newCounters = get().counters.map((counter) => {
      if (counter.id === keysetId) {
        return { ...counter, counter: counter.counter + by };
      }
      return counter;
    });
    set({ counters: newCounters });
    saveToStorage<KeysetCounter[]>(STORAGE_KEYS.KEYSET_COUNTERS, newCounters);
  },
}));

type ProofStore = {
  proofs: Proof[];
  addProofs: (proofs: Proof[]) => Promise<void>;
  getProofs: () => Proof[];
};

const proofStore = create<ProofStore>((set, get) => ({
  proofs: loadFromStorage<Proof[]>(STORAGE_KEYS.PROOFS, []),
  addProofs: async (proofs) => {
    // make sure we don't add duplicates
    const newProofs = [
      ...get().proofs,
      ...proofs.filter((p) => !get().proofs.includes(p)),
    ];
    set({ proofs: newProofs });
    saveToStorage<Proof[]>(STORAGE_KEYS.PROOFS, newProofs);
  },
  getProofs: () => {
    return get().proofs;
  },
}));

type MintQuote2 = MintQuote & {
  /** The counter that should be used when minting proofs */
  counter: KeysetCounter;
  /** The output amounts to use when minting proofs */
  outputAmounts: number[];
};

type MintQuoteStore = {
  quotes: MintQuote2[];
  /** Create a mint quote and add it to the store */
  createMintQuote: (
    wallet: CashuWallet,
    amount: Money,
    proofStore: ProofStore,
    keysetStore: KeysetStore,
    opts?: { description?: string },
  ) => Promise<MintQuote2>;
  /** Fetch the current state of a mint quote and update the store if it has changed */
  updateMintQuoteState: (
    wallet: CashuWallet,
    quote: MintQuote,
  ) => Promise<MintQuote2>;
  /** Claim a mint quote and add the proofs to the proof store */
  claimMintQuote: (
    wallet: CashuWallet,
    amount: Money,
    quoteId: string,
    proofStore: ProofStore,
  ) => Promise<Proof[]>;
  getQuote: (quoteId: string) => MintQuote2 | undefined;
  getQuoteState: (quoteId: string) => MintQuoteState | undefined;
};

const mintQuoteStore = create<MintQuoteStore>((set, get) => ({
  quotes: [],
  createMintQuote: async (wallet, amount, proofStore, keysetStore, opts) => {
    await wallet.loadMint();
    const unit = getUnitFromMoney(amount);

    const mintQuote = await wallet.createMintQuote(
      amount.toNumber(unit),
      opts?.description,
    );

    console.log('fetched mint quote', mintQuote);

    const keysetId = wallet.keysetId;
    let keysetCounter = keysetStore.getKeysetCounter(keysetId);
    if (!keysetCounter) {
      keysetCounter = { id: keysetId, counter: 0 };
      keysetStore.addKeyset(
        {
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          ...wallet.keysets.find((ks) => ks.id === keysetId)!,
        },
        keysetCounter.counter,
      );
    }
    const keys = await wallet.getKeys();
    // optimize the amounts for proofs we want to keep so minimize swapping later
    // targetCount is the targer number of proofs for each amount
    const targetCount = 3;
    const outputAmounts = getKeepAmounts(
      proofStore.getProofs(),
      amount.toNumber(unit),
      keys.keys,
      targetCount,
    );
    console.log('outputAmounts', outputAmounts);
    const newQuote: MintQuote2 = {
      ...mintQuote,
      counter: keysetCounter,
      outputAmounts,
    };
    set({
      quotes: [...get().quotes, newQuote],
    });
    keysetStore.incrementKeysetCounter(keysetId, outputAmounts.length);
    return newQuote;
  },
  updateMintQuoteState: async (wallet, quote) => {
    const updatedQuote = await wallet.checkMintQuote(quote.quote);
    if (updatedQuote.state === MintQuoteState.ISSUED) {
      throw new Error('Quote is already issued');
    }
    const currentQuote = get().getQuote(quote.quote);
    if (!currentQuote) {
      throw new Error('Quote not found');
    }
    if (currentQuote.state === updatedQuote.state) {
      return currentQuote;
    }
    const updatedStoredQuote: MintQuote2 = {
      ...currentQuote,
      state: updatedQuote.state,
    };
    set({
      quotes: get().quotes.map((q) =>
        q.quote === quote.quote ? updatedStoredQuote : q,
      ),
    });
    return updatedStoredQuote;
  },
  claimMintQuote: async (wallet, amount, quoteId, proofStore) => {
    const state = get().getQuoteState(quoteId);
    if (state !== MintQuoteState.PAID) {
      throw new Error('Quote is not paid, call updateMintQuoteState first');
    }

    const unit = getUnitFromMoney(amount);

    const quote = get().getQuote(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    const keepAmounts: number[] = quote.outputAmounts;

    const options = {
      // optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
      // we will need this to recover
      counter: quote.counter.counter,
      // override the keysetId derived from the current mintKeys with a custom one.
      // This should be a keyset that was fetched from the `/keysets` endpoint
      // I'm not yet sure if we need this, but I think we need  a counter for each keyset
      keysetId: quote.counter.id,
      // optionally provide all currently stored proofs of this mint.
      // Cashu-ts will use them to derive the optimal output amounts
      proofsWeHave: undefined,
      //optionally specify the output's amounts to keep and to send
      outputAmounts: {
        keepAmounts: keepAmounts,
        sendAmounts: [],
      },
    };

    try {
      const proofs = await wallet.mintProofs(
        amount.toNumber(unit),
        quoteId,
        options,
      );
      console.log('proofs', proofs);
      // throw new Error("test")
      // if this fails we will try to recover in the catch block
      await proofStore.addProofs(proofs);
      // update quote state once proofs are safe in the store
      await get().updateMintQuoteState(wallet, quote);
      return proofs;
    } catch (error) {
      console.log('error: ', error);

      if (isAlreadyIssuedError(error)) {
        console.log('Mint quote already issued');
        // Mint quote already issued
        // This means the mint marked as issued but the proofs are not yet safe in the store (OR we messed up the counter)
        // We need to recover here
        // TODO: implement recovery
        // - check the proof store to make sure we didn't already add the proofs
        // - if we did, remove the mint quote from the issued quotes
        // - if we didn't:
        //   - figure out the keyset counter

        if (options.counter === undefined) {
          throw new Error('Counter is required to recover');
        }
        // this should be the number of proofs that should have been minted
        const mintProofsCount = keepAmounts.length;

        const restoreOptions = {
          keysetId: quote.counter.id,
        };

        // NOTE: this could return proofs we already have in our store or that we already minted and then spent
        // I think this is avoidable if we are very careful with the counter
        const { proofs } = await wallet.restore(
          options.counter,
          mintProofsCount,
          restoreOptions,
        );

        console.log('RESTORED', proofs);

        if (proofs.length === 0) {
          console.warn('No proofs to recover');
          return [];
        }
        const proofsWeHave = proofStore.getProofs();

        const proofsToAdd = proofs.filter(
          (p) => !proofsWeHave.some((pp) => pp === p),
        );
        await proofStore.addProofs(proofsToAdd);
        get().updateMintQuoteState(wallet, quote);
        return proofsToAdd;
      }
      throw new Error('Failed to claim mint quote');
    }
  },
  getQuote: (quoteId: string) => {
    return get().quotes.find((q) => q.quote === quoteId);
  },
  getQuoteState: (quoteId: string) => {
    const quote = get().quotes.find((q) => q.quote === quoteId);
    return quote?.state;
  },
}));

// should be something from OS
// this is required for deterministic secrets which we need for recovery
const bip39seed = new Uint8Array([
  32, 87, 25, 217, 228, 0, 139, 17, 203, 16, 17, 184, 0, 218, 171, 96, 20, 21,
  191, 96, 2, 159, 23, 232, 104, 88, 245, 68, 15, 8, 42, 57,
]);

type Props = {
  amount: Money;
  account: Account & { type: 'cashu' };
};

export default function ReceiveCashu({ amount, account }: Props) {
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
    unit: cashuUnit,
    bip39seed,
  });
  const mintQuoteRef = useRef<MintQuote | null>(null);
  const useProofStore = useStore(proofStore);
  const useKeysetStore = useStore(keysetStore);
  const { createMintQuote, updateMintQuoteState, claimMintQuote } =
    useStore(mintQuoteStore);

  const {
    isLoading: loadingMintQuote,
    isLoadingError: mintQuoteError,
    data: mintQuote,
  } = useQuery({
    queryKey: ['receive-cashu', account.id, amount.toString()],
    queryFn: async () => {
      const mintQuote = await createMintQuote(
        wallet,
        amount,
        useProofStore,
        useKeysetStore,
      ).catch((e) => {
        console.log('error creating mint quote', e);
        throw e;
      });
      console.log('mintQuote', mintQuote);
      mintQuoteRef.current = mintQuote;
      return mintQuote;
    },
  });

  const { data: quoteStatus } = useQuery({
    queryKey: ['receive-cashu-status', mintQuote?.quote],
    queryFn: async () => {
      if (!mintQuoteRef.current?.quote) return null;
      const quoteStatus = await updateMintQuoteState(
        wallet,
        mintQuoteRef.current,
      );
      console.log('quoteStatus', quoteStatus);
      if (quoteStatus.state === MintQuoteState.PAID) {
        try {
          await claimMintQuote(
            wallet,
            amount,
            mintQuoteRef.current.quote,
            useProofStore,
          );
        } catch (error) {
          console.log('error claiming mint quote', error);
          // If claiming fails, throw to trigger a retry
          throw error;
        }
      }
      mintQuoteRef.current.state = quoteStatus.state;
      return quoteStatus;
    },
    throwOnError: true,
    enabled:
      !!mintQuote && mintQuoteRef.current?.state === MintQuoteState.UNPAID,
    refetchInterval: 1500,
    retry: 2, // Retry twice
  });

  const cashuRequest = getCashuRequest(account, {
    amount: amount,
    unit: cashuUnit,
    singleUse: true,
  }).toEncodedRequest();

  const qrCodeValues = [cashuRequest, mintQuoteRef.current?.request];

  console.log('mintQuoteError', mintQuoteError);

  if (loadingMintQuote) {
    return <LoadingScreen />;
  }

  return (
    <>
      <PageHeader>
        <PageBackButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive Ecash</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <Carousel
          opts={{ align: 'center', loop: true }}
          className=" max-w-sm sm:mx-auto "
        >
          <CarouselContent>
            {qrCodeValues.map((value) => (
              <CarouselItem key={value}>
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    {value ? (
                      <QRCodeSVG value={value} />
                    ) : (
                      <div>Loading...</div>
                    )}
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        {quoteStatus?.state === MintQuoteState.PAID && (
          <div className="text-3xl">
            <p>Paid!</p>
          </div>
        )}
      </PageContent>
    </>
  );
}
