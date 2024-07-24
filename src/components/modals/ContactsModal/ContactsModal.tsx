import useContacts from '@/hooks/boardwalk/useContacts';
import { RootState } from '@/redux/store';
import { PublicContact } from '@/types';
import { Button, Modal, TextInput, Table } from 'flowbite-react';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import ContactTableRowItem from './ContactTableRowItem';

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

   return (
      <Modal show={isOpen} onClose={onClose} size={'sm'}>
         <Modal.Header>{mode === 'view' ? 'Contacts' : 'Select a Contact'}</Modal.Header>
         <Modal.Body>
            <TextInput
               placeholder='Search contacts'
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
            />
            <div className='max-h-[300px] overflow-y-auto'>
               <Table>
                  <Table.Body>
                     {filteredContacts.length > 0 && (
                        <>
                           {filteredContacts.map((contact, index) => (
                              <ContactTableRowItem
                                 key={index}
                                 contact={contact}
                                 mode={mode}
                                 handleContactClick={handleContactClick}
                              />
                           ))}
                        </>
                     )}
                  </Table.Body>
               </Table>
            </div>
         </Modal.Body>
         <Modal.Footer>
            <Button onClick={onClose}>Close</Button>
         </Modal.Footer>
      </Modal>
   );
};

export default ContactsModal;
