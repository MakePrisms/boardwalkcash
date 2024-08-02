import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import { useCallback, useMemo } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import AddContactButton from './buttons/AddContactButton';

interface NewContactNotificationProps {
   contact: PublicContact;
   timeAgo: string;
   clearNotification: () => void;
}

const NewContactNotification = ({
   contact,
   clearNotification,
   timeAgo,
}: NewContactNotificationProps) => {
   const { isContactAdded } = useContacts();

   const isAdded = useCallback(
      () => isContactAdded({ pubkey: contact.pubkey }),
      [contact.pubkey, isContactAdded],
   );

   const notificationText = useMemo(() => {
      return isAdded() ? `${contact.username} added you back` : `${contact.username} added you`;
   }, [contact.username, isAdded]);

   const buttons = useMemo(() => {
      if (isAdded()) {
         return [<ClearNotificationButton key={0} clearNotification={clearNotification} />];
      } else {
         return [
            <AddContactButton key={0} contact={contact} clearNotification={clearNotification} />,
            <ClearNotificationButton key={1} clearNotification={clearNotification} />,
         ];
      }
   }, [isAdded, contact, clearNotification]);

   return (
      <>
         <div className='notification-text'>
            {notificationText} - {timeAgo}
         </div>
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default NewContactNotification;
