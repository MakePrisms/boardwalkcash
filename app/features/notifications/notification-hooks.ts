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

const unreadNotificationsQueryKey = ['notifications', 'unread'];

/**
 * Returns a suspense query that returns true if there are any unread notifications of the given type.
 */
export function useHasUnreadNotifications({
  type,
}: { type: NotificationType }): UseSuspenseQueryResult<boolean> {
  const notificationRepository = useNotificationRepository();
  const userRef = useUserRef();

  return useSuspenseQuery({
    queryKey: [unreadNotificationsQueryKey, 'has', type],
    queryFn: () =>
      notificationRepository.hasUnread({ userId: userRef.current.id, type }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

/**
 * Returns a suspense query that returns all unread notifications of the given type.
 */
export function useUnreadNotifications<
  T extends NotificationType = NotificationType,
>(select?: { type?: T }): UseSuspenseQueryResult<
  (Notification<T> & { readAt: string })[]
> {
  const notificationRepository = useNotificationRepository();
  const userRef = useUserRef();

  return useSuspenseQuery({
    queryKey: [unreadNotificationsQueryKey, select?.type],
    queryFn: () =>
      notificationRepository.listUnread({ userId: userRef.current.id }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    select: (data) => {
      if (!select) {
        return data as (Notification<T> & { readAt: string })[];
      }

      return data.filter(
        (n): n is Notification<T> & { readAt: string } =>
          n.type === select.type,
      );
    },
  });
}

/**
 * Returns a mutation that marks a set of notifications as read.
 */
export function useMarkNotificationsAsRead() {
  const notificationRepository = useNotificationRepository();
  const userRef = useUserRef();

  return useMutation({
    mutationFn: ({ notificationIds }: { notificationIds: string[] }) =>
      notificationRepository.markAsRead({
        userId: userRef.current.id,
        notificationIds,
      }),
    retry: 3,
  });
}

function useOnNotificationChange({
  onCreated,
  onRead,
}: {
  onCreated: (notification: Notification) => void;
  onRead: (notification: Notification) => void;
}) {
  const onCreatedRef = useLatest(onCreated);
  const onReadRef = useLatest(onRead);
  const notificationRepository = useNotificationRepository();
  const queryClient = useQueryClient();

  return useSupabaseRealtimeSubscription({
    channelFactory: () =>
      agicashDb.channel('notifications').on(
        'postgres_changes',
        {
          event: '*',
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
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = notificationRepository.toNotification(
              payload.new,
            );
            if (updatedNotification.readAt) {
              onReadRef.current(updatedNotification);
            }
          }
        },
      ),
    onReconnected: () => {
      // Invalidate the hasUnread queries so that they are re-fetched and the cache is updated.
      // This is needed to get any data that might have been updated while the re-connection was in progress.
      queryClient.invalidateQueries({
        queryKey: [unreadNotificationsQueryKey, 'has'],
      });
    },
  });
}

/**
 * Subscribes to changes in the notifications table and keeps the has unread queries up to date.
 */
export function useTrackNotificationsReadStatus() {
  const queryClient = useQueryClient();

  return useOnNotificationChange({
    onCreated: (notification) => {
      // Update the hasUnread cache to true when a new notification is created
      queryClient.setQueryData(
        [unreadNotificationsQueryKey, 'has', notification.type],
        true,
      );
    },
    onRead: () => {
      // Invalidate the hasUnread queries so they refetch and determine if there are still unread notifications
      queryClient.invalidateQueries({
        queryKey: [unreadNotificationsQueryKey, 'has'],
      });
    },
  });
}
