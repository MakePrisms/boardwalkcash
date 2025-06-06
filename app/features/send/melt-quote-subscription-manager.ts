import type { MeltQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuSendQuote } from './cashu-send-quote';

type SubscriptionData = {
  ids: Set<string>;
  quotes: CashuSendQuote[];
  subscriptionPromise: Promise<() => void>;
  onUpdate: (meltQuoteResponse: MeltQuoteResponse) => void;
  removeCloseListener?: () => void;
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
        this.subscriptions.set(mintUrl, {
          ...mintSubscription,
          quotes,
          onUpdate,
        });
        console.debug(
          'Melt quote updates subscription already exists for mint. Updated callback.',
          mintUrl,
          quotes,
        );
        return;
      }

      const unsubscribe = await mintSubscription.subscriptionPromise;
      mintSubscription.removeCloseListener?.();

      console.debug('Unsubscribing from melt quote updates for mint', mintUrl);
      unsubscribe();
    }

    const wallet = getCashuWallet(mintUrl);

    console.debug(
      'Subscribing to melt quote updates for mint',
      mintUrl,
      quotes,
    );

    const subscriptionCallback = (meltQuote: MeltQuoteResponse) => {
      const currentSubscription = this.subscriptions.get(mintUrl);
      if (currentSubscription) {
        currentSubscription.onUpdate(meltQuote);
      }
    };

    const subscriptionPromise = wallet.onMeltQuoteUpdates(
      Array.from(ids),
      subscriptionCallback,
      (error) =>
        console.error('Melt quote updates socket error', {
          cause: error,
        }),
    );

    const subscriptionData: SubscriptionData = {
      ids,
      quotes,
      subscriptionPromise,
      onUpdate,
    };

    this.subscriptions.set(mintUrl, subscriptionData);

    try {
      const unsubscribe = await subscriptionPromise;

      const handleClose = () => {
        subscriptionData.removeCloseListener?.();
        this.subscriptions.delete(mintUrl);
        void this.subscribe({
          mintUrl,
          quotes: subscriptionData.quotes,
          onUpdate: subscriptionData.onUpdate,
        });
      };

      wallet.mint.webSocketConnection?.ws.addEventListener(
        'close',
        handleClose,
      );
      subscriptionData.removeCloseListener = () =>
        wallet.mint.webSocketConnection?.ws.removeEventListener(
          'close',
          handleClose,
        );
      await Promise.resolve(unsubscribe);
    } catch (error) {
      this.subscriptions.delete(mintUrl);
      throw error;
    }
  }
}
