import {
   GetNotificationResponse,
   NotificationType,
   NotificationWithData,
   isContactNotification,
   isTokenNotification,
} from '@/types';
import TokenNotification from './TokenNotification';
import NewContactNotification from './NewContactNotification';
import { useMemo } from 'react';

interface NotificationItemProps {
   notification: NotificationWithData;
   clearNotification: () => void;
}

const NotificationItem = ({ notification, clearNotification }: NotificationItemProps) => {
   const { type, data, processedData } = notification;

   if (type === NotificationType.NewContact && !processedData.contact) {
      console.warn('NewContact notification without contact data:', notification);
      return null;
   }

   if (isTokenNotification(processedData)) {
      return <TokenNotification data={processedData} clearNotification={clearNotification} />;
   } else if (isContactNotification(processedData)) {
      return <NewContactNotification data={processedData} clearNotification={clearNotification} />;
   } else {
      console.error('Unknown notification type', notification);
      return null;
   }
};

export default NotificationItem;
