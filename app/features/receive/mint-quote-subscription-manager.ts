import type { MintQuoteResponse } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { computeSHA256 } from '~/lib/sha256';
import type { CashuReceiveQuote } from './cashu-receive-quote';

export class MintQuoteSubscriptionManager {
  private subscriptions: Map<
    string,
    { subscriptionHash: string; subscriptionPromise: Promise<() => void> }
  > = new Map();

  async subscribe({
    mintUrl,
    quotes,
    onUpdate,
  }: {
    mintUrl: string;
    quotes: CashuReceiveQuote[];
    onUpdate: (mintQuoteResponse: MintQuoteResponse) => void;
  }): Promise<void> {
    const subscriptionHash = await this.getSubscriptionHash(quotes);
    const mintSubscription = this.subscriptions.get(mintUrl);

    if (mintSubscription) {
      await mintSubscription.subscriptionPromise;

      if (subscriptionHash === mintSubscription.subscriptionHash) {
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
      quotes.map((x) => x.quoteId),
      onUpdate,
      (error) =>
        console.error('Mint quote updates socket error', {
          cause: error,
        }),
    );

    this.subscriptions.set(mintUrl, {
      subscriptionHash,
      subscriptionPromise,
    });

    try {
      await subscriptionPromise;
    } catch (error) {
      this.subscriptions.delete(mintUrl);
      throw error;
    }
  }

  private async getSubscriptionHash(
    quotes: CashuReceiveQuote[],
  ): Promise<string> {
    // Concatenate quoteIds to create a unique key for the subscription
    const data = `${quotes.map((x) => x.quoteId).join('_')}`;
    return await computeSHA256(data);
  }
}
