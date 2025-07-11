import {
  REALTIME_LISTEN_TYPES,
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import { agicashDb } from 'app/features/agicash-db/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from '../use-latest';

/**
 * Subscribes to a Supabase Realtime channel when the component mounts and unsubscribes when the component unmounts.
 * Manages channel reconnection in case of errors and timeouts.
 * @param channelFactory - A function that returns the Supabase Realtime channel to subscribe to.
 * Note that the factory is called only when the component mounts so any changes to the function after the component mounts will not be reflected in the subscription.
 * If you have a callback for the channel that needs to be updated, you can use the `useLatest` hook to create a stable reference to the callback.
 * @returns The status of the subscription.
 */

interface Options {
  /**
   *  A function that returns the Supabase Realtime channel to subscribe to.
   */
  channelFactory: () => RealtimeChannel;
  /**
   * A callback that is called when the channel is reconnected. Use if you need to refresh the data to catch up with the latest changes.
   */
  onReconnected?: () => void;
  /**
   * The timeout in seconds after which the channel is unsubscribed if the browser tab is inactive (in background).
   */
  inactiveTabTimeoutSeconds?: number;
}

/**
 * The state of the subscription:
 * - 'subscribing' - the channel is being initially subscribed to.
 * - 'subscribed' - the channel is subscribed and the connection is fully established for postgres_changes.
 * - 'reconnecting' - the channel is reconnecting after an error or timeout.
 * - 'closed' - the channel is closed.
 * - 'error' - the channel is in an error state (all reconnection attempts failed). The error is thrown.
 */
type SubscriptionState =
  | {
      status: 'subscribing' | 'subscribed' | 'closed';
    }
  | {
      status: 'error' | 'reconnecting';
      error: Error;
    };

const refreshSessionIfNeeded = async () => {
  await agicashDb.realtime.setAuth();
};

const maxRetries = 3;

/**
 * Subscribes to a Supabase Realtime channel when the component mounts and unsubscribes when the component unmounts.
 * Manages channel reconnection in case of errors and timeouts. The error is thrown if the subscription reconnection fails after the maximum number of retries.
 * @param options - Subcription configuration.
 * @returns The status of the subscription.
 */
export function useSupabaseRealtimeSubscription({
  channelFactory,
  onReconnected,
  inactiveTabTimeoutSeconds = 60 * 10,
}: Options) {
  const [state, setState] = useState<SubscriptionState>({
    status: 'subscribing',
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inactiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onReconnectedRef = useLatest(onReconnected);
  const channelFactoryRef = useLatest(channelFactory);
  const retryCountRef = useRef(0);

  const createChannel = useCallback(() => {
    const channel = channelFactoryRef.current();
    channelRef.current = channel;
    return channel;
  }, []);

  /**
   * Listens for the system postgres_changes ok message and sets the subscription state to 'subscribed' when it is received.
   * Only when this message is received, we can be sure that the connection is fully established for postgres_changes.
   * See https://github.com/supabase/realtime/issues/282 for details.
   */
  const setupSystemMessageListener = useCallback((channel: RealtimeChannel) => {
    channel.on(REALTIME_LISTEN_TYPES.SYSTEM, {}, (payload) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
        console.debug('System postgres_changes ok message received', {
          time: new Date().toISOString(),
          topic: channel.topic,
        });
        setState((curr) => {
          if (curr.status !== 'subscribing') {
            onReconnectedRef.current?.();
          }
          return { status: 'subscribed' };
        });
        retryCountRef.current = 0; // Reset retries on success
      }
    });
  }, []);

  const subscribe = useCallback(async () => {
    await refreshSessionIfNeeded();
    const channel = createChannel();

    console.debug('Realtime channel subscribe called', {
      time: new Date().toISOString(),
      topic: channel.topic,
    });

    setupSystemMessageListener(channel);

    channel.subscribe((status, err) =>
      handleSubscriptionState(channel, status, err),
    );
  }, [createChannel, setupSystemMessageListener]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.debug('Realtime channel unsubscribe called', {
        time: new Date().toISOString(),
        topic: channelRef.current.topic,
      });
      agicashDb.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const resubscribe = useCallback(() => {
    console.debug('Realtime channel resubscribe called', {
      time: new Date().toISOString(),
      topic: channelRef.current?.topic,
    });
    unsubscribe();
    subscribe();
  }, [unsubscribe, subscribe]);

  const handleSubscriptionState = useCallback(
    async (channel: RealtimeChannel, status: string, supabaseError?: Error) => {
      const { topic } = channel;
      console.debug('Realtime channel subscription status changed', {
        time: new Date().toISOString(),
        topic,
        status,
        error: supabaseError,
      });

      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        // We are doing nothing here because this doesn't really mean that the connection is fully established for postgres_changes.
        // We need to wait for the system postgres_changes ok message to be received.
        // See setupSystemMessageListener method above.
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        setState({ status: 'closed' });
      } else if (
        status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
        status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
      ) {
        const event =
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR
            ? 'error'
            : 'timeout';

        if (document.hidden) {
          console.debug(`Channel ${event}, but tab is hidden. Unsubscribing.`, {
            time: new Date().toISOString(),
            topic,
            status,
            error: supabaseError,
          });
          unsubscribe();
          return;
        }

        if (retryCountRef.current < maxRetries) {
          setState({
            status: 'reconnecting',
            error:
              supabaseError ??
              new Error(
                `Error with "${channel.topic}" channel subscription. Status: ${status}`,
              ),
          });

          retryCountRef.current += 1;
          console.debug(`Retrying subscription after ${event}`, {
            time: new Date().toISOString(),
            topic,
            status,
            error: supabaseError,
            attempt: `${retryCountRef.current}/${maxRetries}`,
          });
          resubscribe();
        } else {
          setState({
            status: 'error',
            error: new Error(
              `Error with "${channel.topic}" channel subscription. Status: ${status}`,
              { cause: supabaseError },
            ),
          });
        }
      }
    },
    [resubscribe, unsubscribe],
  );

  const handleVisibilityChangeRef = useLatest(() => {
    if (document.hidden) {
      if (!inactiveTimerRef.current) {
        console.debug('Tab went to background. Starting inactivity timer', {
          time: new Date().toISOString(),
          topic: channelRef.current?.topic,
          inactiveTabTimeoutSeconds,
          status: state.status,
        });

        inactiveTimerRef.current = setTimeout(() => {
          console.debug(
            `Tab inactive for ${inactiveTabTimeoutSeconds} seconds. Unsubscribing.`,
            {
              time: new Date().toISOString(),
              topic: channelRef.current?.topic,
              status: state.status,
            },
          );
          unsubscribe();
        }, inactiveTabTimeoutSeconds * 1000);
      }
    } else {
      console.debug('Tab is visible again', {
        time: new Date().toISOString(),
        topic: channelRef.current?.topic,
        status: state.status,
      });

      if (inactiveTimerRef.current) {
        clearTimeout(inactiveTimerRef.current);
        inactiveTimerRef.current = null;
      }

      if (state.status !== 'subscribed') {
        resubscribe();
      }
    }
  });

  useEffect(() => {
    document.addEventListener('visibilitychange', () =>
      handleVisibilityChangeRef.current(),
    );
    subscribe();

    return () => {
      document.removeEventListener('visibilitychange', () =>
        handleVisibilityChangeRef.current(),
      );
      if (inactiveTimerRef.current) {
        clearTimeout(inactiveTimerRef.current);
      }
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  if (state.status === 'error') {
    throw state.error;
  }

  return state.status;
}
