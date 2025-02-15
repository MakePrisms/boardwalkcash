// actions are specific to the type of notifaction and is something the user can do to interact with the notification

// generic actions: dismiss...

// types of notifications:
// - money received
// - added as contact by other user
// - boardwalk announcement

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

export type NotificationsState = {
  notifications: Notification[];
  unreadCount: number;
  actions: {
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
  };
};
