import { GetNotificationResponse, NotificationType } from '@/types';
import TokenNotification from './TokenNotification';
import NewContactNotification from './NewContactNotification';

interface NotificationItemProps {
   notification: GetNotificationResponse;
   clearNotification: () => void;
}

const NotificationItem = ({ notification, clearNotification }: NotificationItemProps) => {
   const { type, data, contact } = notification;

   if (type === NotificationType.NewContact && !contact) {
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
               />
            );
         } catch (e) {
            console.error(e);
            return null;
         }
      case NotificationType.NewContact:
         return <NewContactNotification contact={contact!} clearNotification={clearNotification} />;
      default:
         return null;
   }
};

export default NotificationItem;
