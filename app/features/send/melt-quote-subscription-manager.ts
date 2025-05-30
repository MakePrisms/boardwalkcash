import type { MeltQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuSendQuote } from './cashu-send-quote';

type SubscriptionData = {
  ids: Set<string>;
  subscriptionPromise: Promise<() => void>;
};

export class MeltQuoteSubscriptionManager {
  private subscriptions: Map<string, SubscriptionData> = new Map();

  async subscribe({
    mintUrl,
    quotes,
    onUpdate,
  }: {
    mintUrl: string;
    quotes: CashuSendQuote[];
    onUpdate: (meltQuoteResponse: MeltQuoteResponse) => void;
  }): Promise<void> {
    const ids = new Set(quotes.map((x) => x.quoteId));
    const mintSubscription = this.subscriptions.get(mintUrl);

    if (mintSubscription) {
      await mintSubscription.subscriptionPromise;

      if (isSubset(ids, mintSubscription.ids)) {
        console.debug(
          'Melt quote updates subscription already exists for mint',
          mintUrl,
          quotes,
        );
        return;
      }

      const unsubscribe = await mintSubscription.subscriptionPromise;

      console.debug('Unsubscribing from melt quote updates for mint', mintUrl);
      unsubscribe();
    }

    const wallet = getCashuWallet(mintUrl);

    console.debug(
      'Subscribing to melt quote updates for mint',
      mintUrl,
      quotes,
    );

    const subscriptionPromise = wallet.onMeltQuoteUpdates(
      Array.from(ids),
      onUpdate,
      (error) =>
        console.error('Melt quote updates socket error', {
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
