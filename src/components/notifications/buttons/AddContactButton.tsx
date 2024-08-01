import useContacts from '@/hooks/boardwalk/useContacts';
import { useToast } from '@/hooks/util/useToast';
import { PublicContact } from '@/types';

interface AddContactButtonProps {
   contact: PublicContact;
   clearNotification: () => void;
}

const AddContactButton = ({ contact, clearNotification }: AddContactButtonProps) => {
   const { addToast } = useToast();
   const { addContact } = useContacts();

   const handleAddContact = async () => {
      await addContact(contact);
      clearNotification();
      addToast('Contact added');
   };

   return (
      <button className='btn-notification' onClick={handleAddContact}>
         add contact
      </button>
   );
};

export default AddContactButton;
