import {
  Bell,
  DollarSign,
  Mail,
  MailOpen,
  MoreVertical,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useSwipeActions } from '~/lib/use-swipeable';
import { cn } from '~/lib/utils';
import type { Notification } from './types';
import { useNotificationStore } from './use-notification-store';

const icons = {
  money_received: <DollarSign className="mr-4 ml-1 h-5 w-5" />,
  contact_request: <UserPlus className="mr-4 ml-1 h-5 w-5" />,
  announcement: <Bell className="mr-4 ml-1 h-5 w-5" />,
};

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

const ManageNotificationMenu = ({
  notification,
}: { notification: Notification }) => {
  const { deleteNotification, toggleReadStatus } = useNotificationStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="hidden sm:block">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleReadStatus(notification.id)}>
          Mark as {notification.read ? 'unread' : 'read'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteNotification(notification.id)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type SwipeBackgroundProps = {
  direction: 'left' | 'right';
  offset: number;
  isRead: boolean;
};

/** The background that appears when swiping a notification. */
const SwipeBackground = ({
  direction,
  offset,
  isRead,
}: SwipeBackgroundProps) => {
  const isLeft = direction === 'left';
  const opacity = Math.max(0, Math.min(1, (isLeft ? -offset : offset) / 150));

  if (isLeft) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-end rounded-lg bg-destructive px-4"
        style={{
          opacity,
          zIndex: offset < 0 ? 1 : 0,
          transform: `translateX(${offset}px)`,
        }}
      >
        <Trash2 className="h-6 w-6 text-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-start rounded-lg px-4',
        {
          'border border-primary bg-background': !isRead,
          'bg-card': isRead,
        },
      )}
      style={{
        opacity,
        zIndex: offset > 0 ? 1 : 0,
        transform: `translateX(${offset}px)`,
      }}
    >
      {isRead ? <Mail /> : <MailOpen />}
    </div>
  );
};

export const NotificationListItem = ({
  notification: n,
}: { notification: Notification }) => {
  const { deleteNotification, toggleReadStatus } = useNotificationStore();

  const { offset, isTransitioning, swipeHandlers } = useSwipeActions({
    onSwipeLeft: () => deleteNotification(n.id),
    onSwipeRight: () => toggleReadStatus(n.id),
  });

  return (
    <div key={n.id} className="relative">
      <div className="absolute inset-0 flex rounded-lg">
        <SwipeBackground direction="right" offset={offset} isRead={n.read} />
        <SwipeBackground direction="left" offset={offset} isRead={n.read} />
      </div>

      <Card
        {...swipeHandlers}
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
                  <ManageNotificationMenu notification={n} />
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
};
