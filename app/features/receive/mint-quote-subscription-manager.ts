import type { MintQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuReceiveQuote } from './cashu-receive-quote';

type SubscriptionData = {
  ids: Set<string>;
  subscriptionPromise: Promise<() => void>;
};

export class MintQuoteSubscriptionManager {
  private subscriptions: Map<string, SubscriptionData> = new Map();

  async subscribe({
    mintUrl,
    quotes,
    onUpdate,
  }: {
    mintUrl: string;
    quotes: CashuReceiveQuote[];
    onUpdate: (mintQuoteResponse: MintQuoteResponse) => void;
  }): Promise<void> {
    const ids = new Set(quotes.map((x) => x.quoteId));
    const mintSubscription = this.subscriptions.get(mintUrl);

    if (mintSubscription) {
      await mintSubscription.subscriptionPromise;

      if (isSubset(ids, mintSubscription.ids)) {
        console.debug(
          'Mint quote updates subscription already exists for mint',
          mintUrl,
          quotes,
        );
        return;
      }

      const unsubscribe = await mintSubscription.subscriptionPromise;

      console.debug('Unsubscribing from mint quote updates for mint', mintUrl);
      unsubscribe();
    }

    const wallet = getCashuWallet(mintUrl);

    console.debug(
      'Subscribing to mint quote updates for mint',
      mintUrl,
      quotes,
    );

    const subscriptionPromise = wallet.onMintQuoteUpdates(
      Array.from(ids),
      onUpdate,
      (error) =>
        console.error('Mint quote updates socket error', {
          cause: error,
        }),
    );

    this.subscriptions.set(mintUrl, {
      ids,
      subscriptionPromise,
    });

    try {
      await subscriptionPromise;
    } catch (error) {
      this.subscriptions.delete(mintUrl);
      throw error;
    }
  }
}
