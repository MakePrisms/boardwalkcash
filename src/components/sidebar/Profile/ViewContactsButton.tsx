import ContactsModal from '@/components/modals/ContactsModal/ContactsModal';
import { Button } from 'flowbite-react';
import { useState } from 'react';

const ViewContactsButton = () => {
   const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

   return (
      <div className='flex justify-end'>
         <Button onClick={() => setIsContactsModalOpen(true)} className='btn-primary'>
            Contacts
         </Button>
         <ContactsModal
            isOpen={isContactsModalOpen}
            onClose={() => setIsContactsModalOpen(false)}
            mode='view'
         />
      </div>
   );
};

export default ViewContactsButton;
