import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import { useMemo } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import AddContactButton from './buttons/AddContactButton';

interface NewContactNotificationProps {
   contact: PublicContact;
   clearNotification: () => void;
}

const NewContactNotification = ({ contact, clearNotification }: NewContactNotificationProps) => {
   const { isContactAdded } = useContacts();

   const notificationText = isContactAdded({ pubkey: contact.pubkey })
      ? `${contact.username} added you back`
      : `${contact.username} added you`;

   const buttons = useMemo(() => {
      if (isContactAdded({ pubkey: contact.pubkey })) {
         return [<ClearNotificationButton key={0} clearNotification={clearNotification} />];
      } else {
         return [
            <AddContactButton key={0} contact={contact} clearNotification={clearNotification} />,
            <ClearNotificationButton key={1} clearNotification={clearNotification} />,
         ];
      }
   }, [isContactAdded, contact]);

   return (
      <>
         <div className='text-end'>{notificationText}</div>
         <div className={`flex space-x-4 ${buttons.length === 1 ? 'justify-end' : 'justify-end'}`}>
            {buttons}
         </div>
      </>
   );
};

export default NewContactNotification;
