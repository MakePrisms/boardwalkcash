import type { MintQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuReceiveQuote } from './cashu-receive-quote';

type SubscriptionData = {
  ids: Set<string>;
  quotes: CashuReceiveQuote[];
  subscriptionPromise: Promise<() => void>;
  onUpdate: (mintQuoteResponse: MintQuoteResponse) => void;
  removeCloseListener?: () => void;
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
        this.subscriptions.set(mintUrl, {
          ...mintSubscription,
          quotes,
          onUpdate,
        });
        console.debug(
          'Mint quote updates subscription already exists for mint. Updated callback.',
          mintUrl,
          quotes,
        );
        return;
      }

      const unsubscribe = await mintSubscription.subscriptionPromise;
      mintSubscription.removeCloseListener?.();

      console.debug('Unsubscribing from mint quote updates for mint', mintUrl);
      unsubscribe();
    }

    const wallet = getCashuWallet(mintUrl);

    console.debug(
      'Subscribing to mint quote updates for mint',
      mintUrl,
      quotes,
    );

    const subscriptionCallback = (mintQuote: MintQuoteResponse) => {
      const currentSubscription = this.subscriptions.get(mintUrl);
      if (currentSubscription) {
        currentSubscription.onUpdate(mintQuote);
      }
    };

    const subscriptionPromise = wallet.onMintQuoteUpdates(
      Array.from(ids),
      subscriptionCallback,
      (error) =>
        console.error('Mint quote updates socket error', {
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
        console.debug('Mint quote updates socket closed', mintUrl);
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
      // ignore unsubscribe as socket close will cancel it automatically
      await Promise.resolve(unsubscribe);
    } catch (error) {
      this.subscriptions.delete(mintUrl);
      throw error;
    }
  }
}
