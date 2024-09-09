import ContactsModal from '@/components/modals/ContactsModal/ContactsModal';
import { Button } from 'flowbite-react';
import { useState } from 'react';

const ViewContactsButton = ({ className }: { className?: string }) => {
   const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

   return (
      <>
         <Button
            onClick={() => setIsContactsModalOpen(true)}
            className={`btn-primary ${className}`}
         >
            Contacts
         </Button>
         <ContactsModal
            isOpen={isContactsModalOpen}
            onClose={() => setIsContactsModalOpen(false)}
            mode='view'
         />
      </>
   );
};

export default ViewContactsButton;
