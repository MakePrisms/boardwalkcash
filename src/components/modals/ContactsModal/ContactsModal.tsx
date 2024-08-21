import useContacts from '@/hooks/boardwalk/useContacts';
import { RootState } from '@/redux/store';
import { PublicContact } from '@/types';
import { Modal } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import ViewContactsModalBody from './ViewContactsModalBody';
import AddContactModalBody from './AddContactModalBody';

interface ContactsModalProps {
   isOpen: boolean;
   onClose: () => void;
   onSelectContact?: (contact: PublicContact) => void;
   mode: 'view' | 'select';
}

const ContactsModal: React.FC<ContactsModalProps> = ({
   isOpen,
   onClose,
   onSelectContact,
   mode,
}) => {
   const [searchTerm, setSearchTerm] = useState('');
   const user = useSelector((state: RootState) => state.user);
   const { sortedContacts } = useContacts();
   const [addingContact, setAddingContact] = useState(false);
   const [modalTitle, setModalTitle] = useState('Contacts');

   const filteredContacts = useMemo(() => {
      const f = [
         ...sortedContacts,
         {
            username: user.username ? `${user.username} (me)` : '(me)',
            pubkey: user.pubkey!,
         } as PublicContact,
      ].filter(contact => contact.username?.toLowerCase().includes(searchTerm.toLowerCase()));

      return f;
   }, [searchTerm, sortedContacts, user.pubkey]);

   const handleContactClick = (contact: PublicContact) => {
      if (mode === 'select' && onSelectContact) {
         onSelectContact(contact);
         onClose();
      }
   };

   useEffect(() => {
      if (addingContact) {
         setModalTitle('Add Contact');
      } else if (mode === 'view') {
         setModalTitle('Contacts');
      } else {
         setModalTitle('Select a Contact');
      }
   }, [mode, addingContact]);

   return (
      <Modal show={isOpen} onClose={onClose} size={'sm'}>
         <Modal.Header>{modalTitle}</Modal.Header>
         <ViewContactsModalBody mode={mode} onSelectContact={handleContactClick} />
      </Modal>
   );
};

export default ContactsModal;
