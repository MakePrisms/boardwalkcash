import { ScrollArea, ScrollBar } from '~/components/ui/scroll-area';
import { NotificationListItem } from './notification-list-item';
import type { Notification } from './types';

type NotificationsListProps = {
  notifications: Notification[];
};

export const NotificationsList = ({
  notifications,
}: NotificationsListProps) => {
  return (
    <>
      {notifications.length > 0 ? (
        <ScrollArea>
          <div className="flex flex-col gap-4 sm:mr-4">
            {notifications.map((n) => (
              <NotificationListItem key={n.id} notification={n} />
            ))}
          </div>
          <ScrollBar />
        </ScrollArea>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p>No notifications</p>
        </div>
      )}
    </>
  );
};
