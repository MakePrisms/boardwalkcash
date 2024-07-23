import { RootState } from '@/redux/store';
import { PublicContact } from '@/types';
import { Button, Modal, TextInput, Table } from 'flowbite-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

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
   const contacts = useSelector((state: RootState) => state.user.contacts);

   const filteredContacts = contacts.filter(contact =>
      contact.username?.toLowerCase().includes(searchTerm.toLowerCase()),
   );

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
                     {filteredContacts.map((contact, index) => (
                        <Table.Row
                           key={index}
                           onClick={() => handleContactClick(contact)}
                           className={mode === 'select' ? 'cursor-pointer hover:bg-gray-100' : ''}
                        >
                           <Table.Cell>{contact.username}</Table.Cell>
                        </Table.Row>
                     ))}
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
