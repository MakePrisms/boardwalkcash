import {
  type AgicashDb,
  type AgicashDbNotification,
  agicashDb,
} from '../agicash-db/database';
import type { Notification, NotificationType } from './notification';

type Options = {
  abortSignal?: AbortSignal;
};

class NotificationRepository {
  constructor(private readonly db: AgicashDb) {}

  /**
   * Lists all unread notifications of the given type.
   */
  async listUnread(
    { userId, type }: { userId: string; type?: NotificationType },
    options?: Options,
  ): Promise<Notification[]> {
    const query = this.db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false });
    if (type) {
      query.eq('type', type);
    }

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error('Failed to list unread notifications.', { cause: error });
    }

    return data.map(this.toNotification);
  }

  /**
   * Checks if there are any unread notifications of the given type.
   * Only fetches the count of unread notifications, not the notifications themselves.
   * @returns True if there are any unread notifications of the given type, false otherwise.
   */
  async hasUnread(
    { userId, type }: { userId: string; type?: NotificationType },
    options?: Options,
  ): Promise<boolean> {
    const query = this.db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    if (type) {
      query.eq('type', type);
    }

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error, count } = await query;
    if (error) {
      throw new Error('Failed to check for unread notifications.', {
        cause: error,
      });
    }

    return (count ?? 0) > 0;
  }

  /**
   * Marks a set of notifications as read by setting the read_at column to the current date and time.
   */
  async markAsRead(
    { userId, notificationIds }: { userId: string; notificationIds: string[] },
    options?: Options,
  ): Promise<void> {
    const query = this.db
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .match({
        user_id: userId,
      })
      .in('id', notificationIds);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;
    if (error) {
      throw new Error('Failed to mark notifications as read.', {
        cause: error,
      });
    }
  }

  toNotification(data: AgicashDbNotification): Notification {
    const baseNotification = {
      id: data.id,
      createdAt: data.created_at,
      readAt: data.read_at,
    };

    switch (data.type) {
      case 'PAYMENT_RECEIVED':
        if (!data.transaction_id) {
          throw new Error(
            'PAYMENT_RECEIVED notification must have a transaction_id.',
          );
        }
        return {
          ...baseNotification,
          type: 'PAYMENT_RECEIVED',
          transactionId: data.transaction_id,
        };
      default:
        throw new Error(`Unknown notification type: ${data.type}`);
    }
  }
}

export function useNotificationRepository() {
  return new NotificationRepository(agicashDb);
}
