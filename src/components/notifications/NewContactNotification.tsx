import { ContactNotificationData } from '@/types';
import { useMemo } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import AddContactButton from './buttons/AddContactButton';
import NotificationItemText from './NotificationItemText';

interface NewContactNotificationProps {
   data: ContactNotificationData;
   clearNotification: () => void;
}

const NewContactNotification = ({ data, clearNotification }: NewContactNotificationProps) => {
   const { contact, contactIsAdded, timeAgo } = data;
   const notificationText = useMemo(() => {
      return contactIsAdded
         ? `${contact.username} added you back`
         : `${contact.username} added you`;
   }, [contact.username, contactIsAdded]);

   const buttons = useMemo(() => {
      if (contactIsAdded) {
         return [<ClearNotificationButton key={0} clearNotification={clearNotification} />];
      } else {
         return [
            <AddContactButton key={0} contact={contact} clearNotification={clearNotification} />,
            <ClearNotificationButton key={1} clearNotification={clearNotification} />,
         ];
      }
   }, [contactIsAdded, contact, clearNotification]);

   return (
      <>
         <NotificationItemText text={notificationText} time={timeAgo} />
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default NewContactNotification;
