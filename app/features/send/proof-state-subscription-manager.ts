import type { Proof, ProofState } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { isSubset } from '~/lib/utils';
import type { CashuSendSwap, PendingCashuSendSwap } from './cashu-send-swap';

type Subscription = {
  ids: Set<string>;
  swaps: PendingCashuSendSwap[];
  subscriptionPromise: Promise<() => void>;
  onSpent: (swap: CashuSendSwap) => void;
  removeCloseListener?: () => void;
};

export class ProofStateSubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private proofUpdates: Record<string, Record<string, ProofState['state']>> =
    {};

  async subscribe({
    mintUrl,
    swaps,
    onSpent,
  }: {
    mintUrl: string;
    swaps: PendingCashuSendSwap[];
    onSpent: (swap: CashuSendSwap) => void;
  }): Promise<void> {
    const ids = new Set(swaps.map((x) => x.id));
    const mintSubscription = this.subscriptions.get(mintUrl);

    if (mintSubscription) {
      await mintSubscription.subscriptionPromise;

      if (isSubset(ids, mintSubscription.ids)) {
        this.subscriptions.set(mintUrl, {
          ...mintSubscription,
          swaps,
          onSpent,
        });
        console.debug(
          'Proof state updates subscription already exists for mint. Updated callback.',
          mintUrl,
          swaps,
        );
        return;
      }

      const unsubscribe = await mintSubscription.subscriptionPromise;
      mintSubscription.removeCloseListener?.();

      console.debug('Unsubscribing from proof state updates for mint', mintUrl);
      unsubscribe();
    }

    const wallet = getCashuWallet(mintUrl);

    console.debug('Subscribing to proof state updates for mint', {
      mintUrl,
      swaps,
    });

    const subscriptionCallback = (
      proofUpdate: ProofState & { proof: Proof },
    ) => {
      const currentSubscription = this.subscriptions.get(mintUrl);
      if (currentSubscription) {
        this.handleProofStateUpdate(
          proofUpdate,
          swaps,
          currentSubscription.onSpent,
        );
      }
    };

    const subscriptionPromise = wallet.onProofStateUpdates(
      swaps.flatMap((x) => x.proofsToSend),
      subscriptionCallback,
      (error) =>
        console.error('Proof state updates socket error', {
          cause: error,
        }),
    );

    const subscriptionData: Subscription = {
      ids,
      swaps,
      subscriptionPromise,
      onSpent,
    };

    this.subscriptions.set(mintUrl, subscriptionData);

    try {
      const unsubscribe = await subscriptionPromise;

      const handleClose = () => {
        subscriptionData.removeCloseListener?.();
        this.subscriptions.delete(mintUrl);
        void this.subscribe({
          mintUrl,
          swaps: subscriptionData.swaps,
          onSpent: subscriptionData.onSpent,
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

  private async handleProofStateUpdate(
    proofUpdate: ProofState & { proof: Proof },
    swaps: PendingCashuSendSwap[],
    onSpent: (swap: CashuSendSwap) => void,
  ) {
    console.debug('proofUpdate', proofUpdate);
    const swap = swaps.find((swap) =>
      swap.proofsToSend.some((p) => p.C === proofUpdate.proof.C),
    );
    if (!swap) return;

    if (!this.proofUpdates[swap.id]) {
      this.proofUpdates[swap.id] = {};
    }

    this.proofUpdates[swap.id][proofUpdate.proof.C] = proofUpdate.state;

    const allProofsSpent = swap.proofsToSend.every(
      (proof) => this.proofUpdates[swap.id][proof.C] === 'SPENT',
    );

    console.debug('allProofsSpent', allProofsSpent, { swap });

    if (allProofsSpent) {
      delete this.proofUpdates[swap.id];
      onSpent(swap);
    }
  }
}
