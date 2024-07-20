import { RootState } from '@/redux/store';
import { Button, Modal, TextInput, Table } from 'flowbite-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const ContactsModal = () => {
   const [isOpen, setIsOpen] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const contacts = useSelector((state: RootState) => state.user.contacts);

   const filteredContacts = contacts.filter(contact =>
      contact.username?.toLowerCase().includes(searchTerm.toLowerCase()),
   );

   return (
      <div>
         <Button onClick={() => setIsOpen(true)}>Open Contacts</Button>
         <Modal show={isOpen} onClose={() => setIsOpen(false)} size={'sm'}>
            <Modal.Header>Contacts</Modal.Header>
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
                           <Table.Row key={index}>
                              <Table.Cell>{contact.username}</Table.Cell>
                           </Table.Row>
                        ))}
                     </Table.Body>
                  </Table>
               </div>
            </Modal.Body>
            <Modal.Footer>
               <Button onClick={() => setIsOpen(false)}>Close</Button>
            </Modal.Footer>
         </Modal>
      </div>
   );
};

export default ContactsModal;
