import { create } from 'zustand';
import type { Notification } from './types';

type NotificationStore = {
  notifications: Notification[];
  deleteNotification: (id: string) => void;
  toggleReadStatus: (id: string) => void;
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'money_received',
    title: 'Payment Received',
    description: 'You received $50.00 from John Doe',
    timestamp: new Date(Date.now() - 15 * 1000), // 15 seconds ago
    read: false,
    amount: 50.0,
    from: 'John Doe',
    actions: [
      {
        label: 'View',
        action: () => console.log('View transaction'),
      },
    ],
  },
  {
    id: '2',
    type: 'contact_request',
    title: 'New Contact Request',
    description: 'Jane Smith wants to add you as a contact',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    read: false,
    fromUserId: 'user123',
    fromUserName: 'Jane Smith',
    actions: [
      {
        label: 'Accept',
        action: () => console.log('Accept contact'),
      },
      {
        label: 'Decline',
        action: () => console.log('Decline contact'),
      },
    ],
  },
  {
    id: '3',
    type: 'announcement',
    title: 'New Feature Available',
    description: 'Try our new QR code payment feature!',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
    priority: 'medium',
    actions: [
      {
        label: 'Show me',
        action: () => console.log('Show me'),
      },
    ],
  },
  {
    id: '4',
    type: 'announcement',
    title: 'Welcome to Boardwalk',
    description: 'Thanks for joining! Here are some tips to get started.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
    priority: 'low',
    actions: [
      {
        label: 'Learn more',
        action: () => console.log('Learn more'),
      },
    ],
  },
];

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [
    // just to have more notifications for testing
    ...mockNotifications,
    ...mockNotifications.map((n) => ({ ...n, id: `${n.id}1` })),
    ...mockNotifications.map((n) => ({ ...n, id: `${n.id}2` })),
    ...mockNotifications.map((n) => ({ ...n, id: `${n.id}3` })),
  ],
  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  toggleReadStatus: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: !n.read } : n,
      ),
    })),
}));
