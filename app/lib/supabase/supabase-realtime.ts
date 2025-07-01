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
      console.debug(
        `Supabase realtime subscription for "${channel.topic}"`,
        status,
        error,
      );

      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        setState({ status: 'subscribed' });
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        setState({ status: 'closed' });
      } else {
        // Don't treat errors as errors if the browser tab is not in the foreground
        // because the error is caused by closed connection. Supabase realtime will automatically reconnect.
        const isPageVisible = document.visibilityState === 'visible';
        if (!isPageVisible) {
          console.debug(
            `Ignoring subscription error for "${channel.topic}" because page is not visible`,
            status,
            error,
          );
          return;
        }

        setState({
          status: 'error',
          error: new Error(
            `Error with "${channel.topic}" channel subscription. Status: ${status}`,
            { cause: error },
          ),
        });
      }
    });
    console.debug('Subscribed to supabase realtime', channel.topic);

    return () => {
      console.debug('Unsubscribing from supabase realtime', channel.topic);
      channel.unsubscribe();
    };
  }, []);

  if (state.status === 'error') {
    throw state.error;
  }

  return state.status;
}
