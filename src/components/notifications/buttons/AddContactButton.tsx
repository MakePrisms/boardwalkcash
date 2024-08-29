import useContacts from '@/hooks/boardwalk/useContacts';
import useGifts from '@/hooks/boardwalk/useGifts';
import { useToast } from '@/hooks/util/useToast';
import { PublicContact } from '@/types';

interface AddContactButtonProps {
   contact: PublicContact;
   clearNotification: () => void;
}

const AddContactButton = ({ contact, clearNotification }: AddContactButtonProps) => {
   const { addToast } = useToast();
   const { addContact } = useContacts();
   const { loadUserCustomGifts } = useGifts();

   const handleAddContact = async () => {
      /* reload gifts after contact is added to load any custom gifts */
      await addContact(contact).then(() => loadUserCustomGifts(contact.pubkey));
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
