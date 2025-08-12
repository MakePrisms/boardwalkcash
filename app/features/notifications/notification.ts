export type NotificationType = 'PAYMENT_RECEIVED';

export type Notification<T extends NotificationType = NotificationType> = {
  /** The ID of the notification. */
  id: string;
  /**
   * The type of notification.
   * - PAYMENT_RECEIVED: A receive transaction was completed and transaction history was updated.
   */
  type: T;
  /** The date and time the notification was created in ISO 8601 format. */
  createdAt: string;
} & {
  type: 'PAYMENT_RECEIVED';
  /** The ID of the received transaction that triggered the notification. */
  transactionId: string;
};
