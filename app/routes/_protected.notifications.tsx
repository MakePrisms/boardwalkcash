import {
  Bell,
  DollarSign,
  Mail,
  MailOpen,
  MoreVertical,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { create } from 'zustand';
import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '~/components/ui/scroll-area';
import type { Notification } from '~/features/notifications/types';

import { cn } from '~/lib/utils';

const icons = {
  money_received: <DollarSign className="mr-4 ml-1 h-5 w-5" />,
  contact_request: <UserPlus className="mr-4 ml-1 h-5 w-5" />,
  announcement: <Bell className="mr-4 ml-1 h-5 w-5" />,
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

type NotificationStore = {
  notifications: Notification[];
  deleteNotification: (id: string) => void;
  toggleReadStatus: (id: string) => void;
};

const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [
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

function NotificationItem({ notification: n }: { notification: Notification }) {
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { deleteNotification, toggleReadStatus } = useNotificationStore();

  const handleDelete = (id: string) => {
    deleteNotification(id);
  };

  const handleMarkAsRead = (id: string) => {
    toggleReadStatus(id);
  };

  const resetSwipe = (id: string) => {
    setIsTransitioning(true);
    setSwipeOffsets({
      [id]: 0,
    });
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const createSwipeHandlers = (notificationId: string) =>
    useSwipeable({
      onSwiping: (e) => {
        if (Math.abs(e.deltaX) < 15) {
          return;
        }
        if (!isTransitioning) {
          setSwipeOffsets({
            [notificationId]: e.deltaX,
          });
        }
      },
      onSwipedLeft: (e) => {
        if (Math.abs(e.deltaX) > 150) {
          handleDelete(notificationId);
        }
        resetSwipe(notificationId);
      },
      onSwipedRight: (e) => {
        if (Math.abs(e.deltaX) > 150) {
          handleMarkAsRead(notificationId);
        }
        resetSwipe(notificationId);
      },
      onTouchEndOrOnMouseUp: () => {
        resetSwipe(notificationId);
      },
      trackMouse: false,
      trackTouch: true,
      preventScrollOnSwipe: false,
    });
  const offset = swipeOffsets[n.id] || 0;
  const rightOpacity = Math.max(0, Math.min(1, offset / 150));
  const leftOpacity = Math.max(0, Math.min(1, -offset / 150));

  return (
    <div key={n.id} className="relative">
      <div className="absolute inset-0 flex rounded-lg">
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-start rounded-lg px-4',
            {
              'border border-primary bg-background': !n.read,
              'bg-card': n.read,
            },
          )}
          style={{
            opacity: rightOpacity,
            zIndex: offset > 0 ? 1 : 0,
            transform: `translateX(${offset}px)`,
          }}
        >
          {n.read ? <Mail /> : <MailOpen />}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-end rounded-lg bg-destructive px-4"
          style={{
            opacity: leftOpacity,
            zIndex: offset < 0 ? 1 : 0,
            transform: `translateX(${offset}px)`,
          }}
        >
          <Trash2 className="h-6 w-6 text-foreground" />
        </div>
      </div>
      <Card
        {...createSwipeHandlers(n.id)}
        className={cn('relative h-[100px] will-change-transform', {
          'bg-background': n.read,
        })}
        style={{
          transition: isTransitioning
            ? 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'none',
          transform: `translateX(${offset}px)`,
        }}
      >
        <div className="flex h-full items-center p-3">
          <div className="">{icons[n.type]}</div>

          <div className="flex h-full flex-1 flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{n.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">
                    {calculateTimeAgo(n.timestamp)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="hidden sm:block">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMarkAsRead(n.id)}>
                        Mark as {n.read ? 'unread' : 'read'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(n.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="mt-1 text-muted-foreground text-xs">
                {n.description}
              </p>
            </div>
            {n.actions && n.actions.length > 0 && (
              <div className="flex justify-end gap-2">
                {n.actions.map((a) => (
                  <Button
                    className="h-fit py-0 text-xs underline"
                    variant="ghost"
                    key={a.label}
                    onClick={a.action}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function notificationsPage() {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <Page>
      <PageHeader>
        <ClosePageButton transition="slideLeft" to="/" applyTo="oldView" />
        <PageHeaderTitle>Notifications</PageHeaderTitle>
      </PageHeader>
      <PageContent className="overflow-y-auto">
        {notifications.length > 0 ? (
          <ScrollArea>
            <div className="flex flex-col gap-4 sm:mr-4">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
            <ScrollBar />
          </ScrollArea>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p>No notifications</p>
          </div>
        )}
      </PageContent>
    </Page>
  );
}

const calculateTimeAgo = (createdAt: Date) => {
  const now = new Date();
  const createdAtDate = new Date(createdAt);
  const diffInSeconds = Math.floor(
    (now.getTime() - createdAtDate.getTime()) / 1000,
  );

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  }
  return `${Math.floor(diffInSeconds / 86400)}d`;
};
