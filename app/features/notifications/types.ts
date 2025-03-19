// These types need to be reconsidered. This is just what I had from a while ago.
// Lets decided how notifcations should look, what possible notifcations will be,
// and what actinos will be able to be done on them.

// NOTE: my idea for an action is to have buttons that will be shown on the notification.
// This could be things like 'view', 'Learn More', 'Claim', 'Add contact back', etc.

export type NotificationAction = {
  label: string;
  action: () => void;
};

export type BaseNotification = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
};

export type MoneyReceivedNotification = BaseNotification & {
  type: 'money_received';
  amount: number;
  from: string;
};

export type ContactRequestNotification = BaseNotification & {
  type: 'contact_request';
  fromUserId: string;
  fromUserName: string;
};

export type AnnouncementNotification = BaseNotification & {
  type: 'announcement';
  priority: 'low' | 'medium' | 'high';
};

export type Notification =
  | MoneyReceivedNotification
  | ContactRequestNotification
  | AnnouncementNotification;
