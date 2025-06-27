import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useLatest } from '../use-latest';

type SubscriptionState =
  | {
      status: 'subscribing' | 'subscribed' | 'closed';
    }
  | {
      status: 'error';
      error: Error;
    };

/**
 * Subscribes to a Supabase Realtime channel when the component mounts and unsubscribes when the component unmounts.
 * @param channelFactory - A function that returns the Supabase Realtime channel to subscribe to.
 * Note that the factory is called only when the component mounts so any changes to the function after the component mounts will not be reflected in the subscription.
 * If you have a callback for the channel that needs to be updated, you can use the `useLatest` hook to create a stable reference to the callback.
 * @returns The status of the subscription.
 */
export function useSupabaseRealtimeSubscription(
  channelFactory: () => RealtimeChannel,
) {
  const [state, setState] = useState<SubscriptionState>({
    status: 'subscribing',
  });
  const channelFactoryRef = useLatest(channelFactory);

  useEffect(() => {
    const channel = channelFactoryRef.current().subscribe((status, error) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        setState({ status: 'subscribed' });
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        setState({ status: 'closed' });
      } else {
        setState({
          status: 'error',
          error: new Error(
            `Error with "${channel.topic}" channel subscription. Status: ${status}`,
            { cause: error },
          ),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (state.status === 'error') {
    throw state.error;
  }

  return state.status;
}
