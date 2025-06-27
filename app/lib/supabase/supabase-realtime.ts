import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import { use } from 'react';
import { type StoreApi, type UseBoundStore, create } from 'zustand';
import { useEffectNoStrictMode } from '~/hooks/use-effect-no-strict-mode';

type SupabaseRealtimeSubscriptionStore = {
  channel: RealtimeChannel | null;
  subscriptionPromise: Promise<RealtimeChannel> | null;
  subscriptionError: Error | null;
  promiseSettled: boolean;
  subscribe: (
    channelFactory: () => RealtimeChannel,
  ) => Promise<RealtimeChannel>;
  unsubscribe: () => void;
};

export const createSupabaseRealtimeSubscriptionStore = () =>
  create<SupabaseRealtimeSubscriptionStore>((set, get) => ({
    channel: null,
    subscriptionPromise: null,
    promiseSettled: false,
    subscriptionError: null,
    subscribe: (
      channelFactory: () => RealtimeChannel,
    ): Promise<RealtimeChannel> => {
      let subscriptionPromise = get().subscriptionPromise;
      if (subscriptionPromise) {
        return subscriptionPromise;
      }

      subscriptionPromise = new Promise((resolve, reject) => {
        const channel = channelFactory().subscribe((status, error) => {
          if (!get().promiseSettled) {
            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
              resolve(channel);
            } else {
              reject(
                new Error(
                  `Failed to subscribe to "${channel.topic}" channel. Status: ${status}`,
                  {
                    cause: error,
                  },
                ),
              );
            }
            set({ promiseSettled: true });
            return;
          }

          if (
            ![
              REALTIME_SUBSCRIBE_STATES.SUBSCRIBED,
              REALTIME_SUBSCRIBE_STATES.CLOSED,
            ].includes(status)
          ) {
            set({
              subscriptionError: new Error(
                `Error with "${channel.topic}" channel subscription. Status: ${status}`,
                { cause: error },
              ),
            });
          }
        });

        set({ channel });
      });

      set({ subscriptionPromise });
      return subscriptionPromise;
    },
    unsubscribe: async () => {
      const channel = get().channel;
      if (channel) {
        await channel.unsubscribe();
      }
      set({
        channel: null,
        subscriptionPromise: null,
        promiseSettled: false,
        subscriptionError: null,
      });
    },
  }));

/**
 * Create a hook that subscribes to a Supabase Realtime channel and suspends until the subscription is established.
 * @param useStore - The Zustand store to use to store the subscription state. Create the store using `createSupabaseRealtimeSubscriptionStore`.
 * @returns A hook to invoke in the component to subscribe to a Supabase Realtime channel.
 */
export function createSupabaseRealtimeChannelHook({
  useStore,
}: {
  useStore: UseBoundStore<StoreApi<SupabaseRealtimeSubscriptionStore>>;
}) {
  return (channelFactory: () => RealtimeChannel) => {
    const { subscribe, unsubscribe, subscriptionError } = useStore();

    const channel = use(subscribe(channelFactory));

    if (subscriptionError) {
      throw subscriptionError;
    }

    useEffectNoStrictMode(() => {
      return () => unsubscribe();
    }, [unsubscribe]);

    return channel;
  };
}
