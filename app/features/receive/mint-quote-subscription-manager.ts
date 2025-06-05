import type { MintQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuReceiveQuote } from './cashu-receive-quote';

type SubscriptionData = {
  ids: Set<string>;
  subscriptionPromise: Promise<() => void>;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  connection: any;
  quotes: CashuReceiveQuote[];
  onUpdate: (mintQuoteResponse: MintQuoteResponse) => void;
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
      connection: wallet.mint.webSocketConnection,
      quotes,
      onUpdate,
    });

    try {
      await subscriptionPromise;
    } catch (error) {
      this.subscriptions.delete(mintUrl);
      throw error;
    }
  }

  async refresh(): Promise<void> {
    console.debug('Refreshing all mint quote subscriptions');

    const subscriptionEntries = Array.from(this.subscriptions.entries());

    const connectionPromises = subscriptionEntries.map(
      async ([mintUrl, subscription]) => {
        try {
          if (subscription.connection?.ensureConnection) {
            console.debug('Ensuring connection for mint', mintUrl);
            await subscription.connection.ensureConnection();
            console.debug('Connection ensured for mint', mintUrl);
          }
        } catch (error) {
          console.error('Error ensuring connection for mint', {
            mintUrl,
            cause: error,
          });
        }
      },
    );

    await Promise.allSettled(connectionPromises);

    const resubscribePromises = subscriptionEntries.map(
      async ([mintUrl, subscription]) => {
        try {
          console.debug(
            'Resubscribing to mint quote updates for mint',
            mintUrl,
          );

          try {
            const unsubscribe = await subscription.subscriptionPromise;
            unsubscribe();
          } catch (error) {
            console.error('Error unsubscribing during refresh', {
              mintUrl,
              cause: error,
            });
          }

          await this.subscribe({
            mintUrl,
            quotes: subscription.quotes,
            onUpdate: subscription.onUpdate,
          });
        } catch (error) {
          console.error('Error resubscribing during refresh', {
            mintUrl,
            cause: error,
          });
        }
      },
    );

    await Promise.allSettled(resubscribePromises);
  }

  async clearAll(): Promise<void> {
    console.debug('Clearing all mint quote subscriptions');

    const unsubscribePromises = Array.from(this.subscriptions.entries()).map(
      async ([mintUrl, subscription]) => {
        try {
          if (subscription.connection?.ensureConnection) {
            console.debug('Ensuring connection for mint', mintUrl);
            await subscription.connection.ensureConnection();
            console.debug('Connection ensured for mint', mintUrl);
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
