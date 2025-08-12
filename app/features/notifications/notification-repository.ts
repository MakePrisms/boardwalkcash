import {
  type AgicashDb,
  type AgicashDbNotification,
  agicashDb,
} from '../agicash-db/database';
import type { Notification, NotificationType } from './notification';

type Options = {
  abortSignal?: AbortSignal;
};

export class NotificationRepository {
  constructor(private readonly db: AgicashDb) {}

  /**
   * Checks if the user has any notifications of the given type.
   * If no type is provided, any notifications are checked.
   */
  async hasNotifications(
    { userId, type }: { userId: string; type?: NotificationType },
    options?: Options,
  ): Promise<boolean> {
    const query = this.db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (type) {
      query.eq('type', type);
    }

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { count, error } = await query;
    if (error) {
      throw new Error('Failed to check for notifications.', { cause: error });
    }

    return (count ?? 0) > 0;
  }

  /**
   * Deletes a notification by id.
   */
  async delete(notificationId: string, options?: Options): Promise<void> {
    const query = this.db
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;
    if (error) {
      throw new Error('Failed to delete notification.', {
        cause: error,
      });
    }
  }

  /**
   * Deletes all notifications of a specific type for a user.
   */
  async deleteAllByType(
    { userId, type }: { userId: string; type: NotificationType },
    options?: Options,
  ): Promise<void> {
    const query = this.db.from('notifications').delete().match({
      user_id: userId,
      type: type,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;
    if (error) {
      throw new Error('Failed to delete notifications by type.', {
        cause: error,
      });
    }
  }

  toNotification(data: AgicashDbNotification): Notification {
    const baseNotification = {
      id: data.id,
      createdAt: data.created_at,
    };

    if (data.type === 'PAYMENT_RECEIVED' && data.transaction_id) {
      return {
        ...baseNotification,
        type: 'PAYMENT_RECEIVED',
        transactionId: data.transaction_id,
      };
    }

    throw new Error('Invalid notification data', { cause: data });
  }
}

export function useNotificationRepository() {
  return new NotificationRepository(agicashDb);
}
