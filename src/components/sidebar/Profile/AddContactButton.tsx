import useContacts from '@/hooks/boardwalk/useContacts';
import { useToast } from '@/hooks/util/useToast';
import { Button, TextInput } from 'flowbite-react';
import { useState } from 'react';

const AddContactButton = () => {
   const [addContactInput, setAddContactInput] = useState('');
   const [addingContact, setAddingContact] = useState(false);

   const { addToast } = useToast();
   const { addContact, fetchContactByUsername, isContactAdded } = useContacts();

   const handleAddContact = async () => {
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
         await addContact(contact);
         addToast('Contact added', 'success');
         setAddContactInput('');
      } catch (e: any) {
         addToast(e.message, 'error');
      } finally {
         setAddingContact(false);
      }
   };

   return (
      <div className='flex items-center space-x-2'>
         <TextInput
            type='text'
            value={addContactInput}
            onChange={e => setAddContactInput(e.target.value.toLowerCase())}
            className='text-black'
         />
         <Button isProcessing={addingContact} className='mr-3' onClick={handleAddContact}>
            <svg
               xmlns='http://www.w3.org/2000/svg'
               className='h-6 w-6'
               fill='none'
               viewBox='0 0 24 24'
               stroke='currentColor'
               strokeWidth='2'
            >
               <path strokeLinecap='round' strokeLinejoin='round' d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
            </svg>
         </Button>
      </div>
   );
};

export default AddContactButton;
