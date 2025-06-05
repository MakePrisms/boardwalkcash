import type { MintQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuReceiveQuote } from './cashu-receive-quote';

type SubscriptionData = {
  ids: Set<string>;
  subscriptionPromise: Promise<() => void>;
  ensureConnection?: () => Promise<void>;
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
      ensureConnection: wallet.mint.webSocketConnection?.ensureConnection,
    });

    try {
      await subscriptionPromise;
    } catch (error) {
      this.subscriptions.delete(mintUrl);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    console.debug('Clearing all mint quote subscriptions');

    const unsubscribePromises = Array.from(this.subscriptions.entries()).map(
      async ([mintUrl, subscription]) => {
        try {
          if (subscription.ensureConnection) {
            console.debug('Ensuring connection for mint', mintUrl);
            await subscription.ensureConnection();
          }
          const unsubscribe = await subscription.subscriptionPromise;
          console.debug(
            'Unsubscribing from mint quote updates for mint',
            mintUrl,
          );
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from mint quote updates', {
            mintUrl,
            cause: error,
          });
        }
      },
    );

    await Promise.allSettled(unsubscribePromises);
    this.subscriptions.clear();
  }
}
