import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  type UseSuspenseQueryResult,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useSupabaseRealtimeSubscription } from '~/lib/supabase/supabase-realtime';
import { useLatest } from '~/lib/use-latest';
import { type AgicashDbNotification, agicashDb } from '../agicash-db/database';
import { useUserRef } from '../user/user-hooks';
import type { Notification, NotificationType } from './notification';
import { useNotificationRepository } from './notification-repository';

const notificationsQueryKey = 'notifications';

/**
 * Returns a suspense query that returns all notifications of the given type.
 */
export function useNotifications<
  T extends NotificationType = NotificationType,
>(select: { type: T }): UseSuspenseQueryResult<Notification<T>[]> {
  const notificationRepository = useNotificationRepository();
  const userRef = useUserRef();

  return useSuspenseQuery({
    queryKey: [notificationsQueryKey, select.type],
    queryFn: () =>
      notificationRepository.list({
        userId: userRef.current.id,
        type: select.type,
      }),
    staleTime: 0,
    refetchOnMount: 'always',
    select: (data) =>
      data.filter((n): n is Notification<T> => n.type === select.type),
  });
}

export function useNotificationByTransactionId(transactionId: string) {
  const notificationRepository = useNotificationRepository();

  return useSuspenseQuery({
    queryKey: [notificationsQueryKey, 'byTransactionId', transactionId],
    queryFn: () => notificationRepository.getByTransactionId(transactionId),
  });
}

export function useHasNotifications(select: {
  type: NotificationType;
}): UseSuspenseQueryResult<boolean> {
  const notificationRepository = useNotificationRepository();
  const userRef = useUserRef();

  return useSuspenseQuery({
    queryKey: [notificationsQueryKey, 'has', select.type],
    queryFn: () =>
      notificationRepository.hasNotifications({
        userId: userRef.current.id,
        type: select?.type,
      }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Returns a mutation that deletes a set of notifications.
 */
export function useDeleteNotification() {
  const notificationRepository = useNotificationRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId }: { notificationId: string }) =>
      notificationRepository.delete(notificationId),
    retry: 3,
    onSuccess: () => {
      // We do not know if there are any other notifications of the same type, so we invalidate all of them.
      queryClient.invalidateQueries({
        queryKey: [notificationsQueryKey, 'has'],
      });
    },
  });
}

/**
 * Returns a mutation that deletes all notifications of a specific type.
 * Checks the cache first and only makes the API call if notifications exist.
 */
export function useDeleteAllNotificationsByType({
  type,
}: { type: NotificationType }) {
  const { data: hasNotifications } = useHasNotifications({ type });
  const notificationRepository = useNotificationRepository();
  const userRef = useUserRef();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!hasNotifications) {
        // No notifications to delete, return early
        return Promise.resolve();
      }

      return notificationRepository.deleteAllByType({
        userId: userRef.current.id,
        type,
      });
    },
    onSuccess: () => {
      // We know that all notifications of this type have been deleted, so we can set the cache to false.
      queryClient.setQueryData<boolean>(
        [notificationsQueryKey, 'has', type],
        false,
      );
    },
    retry: 3,
  });
}

function useOnNotificationCreated({
  onCreated,
}: {
  onCreated: (notification: Notification) => void;
}) {
  const onCreatedRef = useLatest(onCreated);
  const notificationRepository = useNotificationRepository();
  const queryClient = useQueryClient();

  return useSupabaseRealtimeSubscription({
    channelFactory: () =>
      agicashDb.channel('notifications').on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'wallet',
          table: 'notifications',
        },
        async (
          payload: RealtimePostgresChangesPayload<AgicashDbNotification>,
        ) => {
          if (payload.eventType === 'INSERT') {
            const createdNotification = notificationRepository.toNotification(
              payload.new,
            );
            onCreatedRef.current(createdNotification);
          }
        },
      ),
    onReconnected: () => {
      // Invalidate the hasNotifications queries so that they are re-fetched and the cache is updated.
      // This is needed to get any data that might have been updated while the re-connection was in progress.
      queryClient.invalidateQueries({
        queryKey: [notificationsQueryKey, 'has'],
      });
    },
  });
}

/**
 * Subscribes to changes in the notifications table and keeps the hasNotifications queries up to date.
 */
export function useTrackHasNotifications() {
  const queryClient = useQueryClient();

  return useOnNotificationCreated({
    onCreated: (notification) => {
      queryClient.setQueryData<boolean>(
        [notificationsQueryKey, 'has', notification.type],
        true,
      );
      if (notification.type === 'PAYMENT_RECEIVED') {
        queryClient.setQueryData<Notification | null>(
          [
            notificationsQueryKey,
            'byTransactionId',
            notification.transactionId,
          ],
          notification,
        );
      }
    },
  });
}
