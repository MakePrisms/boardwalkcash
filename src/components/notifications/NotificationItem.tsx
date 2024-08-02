import { GetNotificationResponse, NotificationType } from '@/types';
import TokenNotification from './TokenNotification';
import NewContactNotification from './NewContactNotification';
import { useMemo } from 'react';

interface NotificationItemProps {
   notification: GetNotificationResponse;
   clearNotification: () => void;
}

const NotificationItem = ({ notification, clearNotification }: NotificationItemProps) => {
   const { type, data, contact } = notification;

   const timeAgo = useMemo(() => {
      const now = new Date();
      const createdAt = new Date(notification.createdAt);
      const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

      if (diffInSeconds < 60) {
         return `${diffInSeconds}s`;
      } else if (diffInSeconds < 3600) {
         return `${Math.floor(diffInSeconds / 60)}m`;
      } else if (diffInSeconds < 86400) {
         return `${Math.floor(diffInSeconds / 3600)}h`;
      } else {
         return `${Math.floor(diffInSeconds / 86400)}d`;
      }
   }, [notification.createdAt]);

   if (type === NotificationType.NewContact && !notification.contact) {
      console.warn('NewContact notification without contact data:', notification);
      return null;
   }

   switch (type) {
      case NotificationType.Token:
         try {
            const parsed = JSON.parse(data) as { token: string; from: string };
            return (
               <TokenNotification
                  token={parsed.token}
                  from={parsed.from}
                  clearNotification={clearNotification}
                  timeAgo={timeAgo}
               />
            );
         } catch (e) {
            console.error(e);
            return null;
         }
      case NotificationType.NewContact:
         return (
            <NewContactNotification
               contact={contact!}
               clearNotification={clearNotification}
               timeAgo={timeAgo}
            />
         );
      default:
         console.error('Unknown notification type', notification);
         return null;
   }
};

export default NotificationItem;
