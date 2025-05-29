import type { Proof, ProofState } from '@cashu/cashu-ts';
import { getCashuWallet } from '~/lib/cashu';
import { computeSHA256 } from '~/lib/sha256';
import type { CashuSendSwap, PendingCashuSendSwap } from './cashu-send-swap';

type Subscription = {
  subscriptionHash: string;
  subscriptionPromise: Promise<() => void>;
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
    const subscriptionHash = await this.getSubscriptionHash(swaps);
    const mintSubscription = this.subscriptions.get(mintUrl);

    if (mintSubscription) {
      await mintSubscription.subscriptionPromise;

      if (subscriptionHash === mintSubscription.subscriptionHash) {
        console.debug(
          'Mint quote updates subscription already exists for mint',
          mintUrl,
          swaps,
        );
        return;
      }

      const unsubscribe = await mintSubscription.subscriptionPromise;

      console.debug('Unsubscribing from mint quote updates for mint', mintUrl);
      unsubscribe();
    }

    const wallet = getCashuWallet(mintUrl);

    console.debug('Subscribing to mint quote updates for mint', {
      mintUrl,
      swaps,
    });

    const subscriptionPromise = wallet.onProofStateUpdates(
      swaps.flatMap((x) => x.proofsToSend),
      (payload) => this.handleProofStateUpdate(payload, swaps, onSpent),
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

  private async getSubscriptionHash(
    swaps: PendingCashuSendSwap[],
  ): Promise<string> {
    // Concatenate swap ids to create a unique key for the subscription
    const data = `${swaps.map((x) => x.id).join('_')}`;
    return await computeSHA256(data);
  }
}
