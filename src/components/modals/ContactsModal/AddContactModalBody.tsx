import { Button, Modal, TextInput } from 'flowbite-react';
import { useState } from 'react';
import useContacts from '@/hooks/boardwalk/useContacts';
import { useToast } from '@/hooks/util/useToast';
import useGifts from '@/hooks/boardwalk/useGifts';

interface AddContactModalBodyProps {
   onContactAdded: () => void;
   onCancel: () => void;
}

const AddContactModalBody = ({ onContactAdded, onCancel }: AddContactModalBodyProps) => {
   const [addContactInput, setAddContactInput] = useState('');
   const [addingContact, setAddingContact] = useState(false);

   const { addToast } = useToast();
   const { addContact, fetchContactByUsername, isContactAdded } = useContacts();
   const { loadUserCustomGifts } = useGifts();

   const handleAddContact = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isContactAdded({ username: addContactInput })) {
         addToast('Contact already added', 'error');
         return;
      }

      const contact = await fetchContactByUsername(addContactInput);

      if (contact === null) {
         addToast('User not found', 'error');
         return;
      }

      try {
         setAddingContact(true);
         /* reload gifts after contact is added to load any custom gifts */
         await addContact(contact).then(() => loadUserCustomGifts(contact.pubkey));
         addToast('Contact added', 'success');
         setAddContactInput('');
         onContactAdded();
      } catch (e: any) {
         addToast(e.message, 'error');
      } finally {
         setAddingContact(false);
      }
   };

   return (
      <Modal.Body>
         <form onSubmit={handleAddContact}>
            <div>
               <TextInput
                  placeholder='Username'
                  className='w-full mb-6'
                  value={addContactInput}
                  onChange={e => setAddContactInput(e.target.value.toLowerCase())}
               />
            </div>
            <div className='flex justify-between mx-3'>
               <Button color='failure' onClick={onCancel}>
                  Cancel
               </Button>
               <Button type='submit' isProcessing={addingContact}>
                  Add
               </Button>
            </div>
         </form>
      </Modal.Body>
   );
};

export default AddContactModalBody;
