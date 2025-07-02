import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { useLatest } from '../use-latest';

type SubscriptionState =
  | {
      status: 'subscribing' | 'subscribed' | 'closed';
    }
  | {
      status: 'error';
      error: Error;
    };

const ERROR_DELAY_MS = 20000;

/**
 * Subscribes to a Supabase Realtime channel when the component mounts and unsubscribes when the component unmounts.
 * @param channelFactory - A function that returns the Supabase Realtime channel to subscribe to.
 * Note that the factory is called only when the component mounts so any changes to the function after the component mounts will not be reflected in the subscription.
 * If you have a callback for the channel that needs to be updated, you can use the `useLatest` hook to create a stable reference to the callback.
 * @returns The status of the subscription.
 */
export function useSupabaseRealtimeSubscription({
  channelFactory,
  onReconnected,
}: {
  channelFactory: () => RealtimeChannel;
  onReconnected?: () => void;
}) {
  const [state, setState] = useState<SubscriptionState>({
    status: 'subscribing',
  });
  const channelFactoryRef = useLatest(channelFactory);
  const onReconnectedRef = useLatest(onReconnected);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Stores the error that occurred while the page was not visible so that it can be handled when the page becomes visible.
  const pendingErrorRef = useRef<{
    status: string;
    error: Error | undefined;
  } | null>(null);

  useEffect(() => {
    const setErrorStateAfterDelay = (
      status: string,
      error: Error | undefined,
    ) => {
      return setTimeout(() => {
        setState({
          status: 'error',
          error: new Error(
            `Error with "${channel.topic}" channel subscription. Status: ${status}`,
            { cause: error },
          ),
        });
      }, ERROR_DELAY_MS);
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        pendingErrorRef.current &&
        !errorTimeoutRef.current
      ) {
        const pendingError = pendingErrorRef.current;
        errorTimeoutRef.current = setErrorStateAfterDelay(
          pendingError.status,
          pendingError.error,
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const channel = channelFactoryRef.current().subscribe((status, error) => {
      console.debug(
        `Supabase realtime subscription for "${channel.topic}"`,
        status,
        error,
      );

      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
        pendingErrorRef.current = null;

        setState((curr) => {
          if (curr.status !== 'subscribing') {
            onReconnectedRef.current?.();
          }
          return {
            status: 'subscribed',
          };
        });
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
        pendingErrorRef.current = null;

        setState({ status: 'closed' });
      } else {
        const isPageVisible = document.visibilityState === 'visible';
        if (!isPageVisible) {
          console.debug(
            `Setting pending error for "${channel.topic}" because page is not visible`,
            status,
            error,
          );
          // Store the error to handle when page becomes visible
          pendingErrorRef.current = { status, error };
          return;
        }

        if (!errorTimeoutRef.current) {
          errorTimeoutRef.current = setErrorStateAfterDelay(status, error);
        }
      }
    });
    console.debug('Subscribed to supabase realtime', channel.topic);

    return () => {
      console.debug('Unsubscribing from supabase realtime', channel.topic);

      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }

      pendingErrorRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      channel.unsubscribe();
    };
  }, []);

  if (state.status === 'error') {
    throw state.error;
  }

  return state.status;
}
