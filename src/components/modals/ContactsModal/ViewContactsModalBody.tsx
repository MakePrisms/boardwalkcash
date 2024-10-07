import React, { useMemo, useState } from 'react';
import { Modal, TextInput, Table } from 'flowbite-react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import ContactTableRowItem from './ContactTableRowItem';
import AddContactModalBody from './AddContactModalBody';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

interface ViewContactsModalBodyProps {
   mode: 'view' | 'select';
   onSelectContact?: (contact: PublicContact) => void;
   // onAddContactClicked: () => void;
}

const ViewContactsModalBody: React.FC<ViewContactsModalBodyProps> = ({ mode, onSelectContact }) => {
   const [searchTerm, setSearchTerm] = useState('');
   const [isAddingContact, setIsAddingContact] = useState(false);
   const user = useSelector((state: RootState) => state.user);
   const { sortedContacts } = useContacts();
   const { activeWallet } = useCashuContext();

   const handleAddContactClick = () => {
      setIsAddingContact(true);
   };

   const handleCancelAddContact = () => {
      setIsAddingContact(false);
   };

   const handleContactAdded = () => {
      setIsAddingContact(false);
   };

   const filteredContacts = useMemo(() => {
      const f = [
         ...sortedContacts,
         {
            username: user.username ? `${user.username} (me)` : '(me)',
            pubkey: user.pubkey!,
            lud16: user.lud16,
            mintlessReceive: user.receiveMode === 'mintless',
            defaultMintUrl: activeWallet?.mint.mintUrl,
            defaultUnit: activeWallet?.keys.unit,
         } as PublicContact,
      ].filter(contact => contact.username?.toLowerCase().includes(searchTerm.toLowerCase()));

      return f;
   }, [searchTerm, sortedContacts, user.pubkey, user.username]);

   const handleContactClick = (contact: PublicContact) => {
      if (mode === 'select' && onSelectContact) {
         onSelectContact(contact);
      }
   };

   return (
      <Modal.Body>
         {isAddingContact ? (
            <AddContactModalBody
               onContactAdded={handleContactAdded}
               onCancel={handleCancelAddContact}
            />
         ) : (
            <>
               <div className='flex justify-between items-center mb-3'>
                  <TextInput
                     placeholder='Search contacts'
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className='w-full'
                  />
                  <button className='ml-3' onClick={handleAddContactClick}>
                     <UserPlusIcon className='h-6 w-6 text-gray-600' />
                  </button>
               </div>
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
                                    userPubkey={user.pubkey}
                                 />
                              ))}
                           </>
                        )}
                     </Table.Body>
                  </Table>
               </div>
            </>
         )}
      </Modal.Body>
   );
};

export default ViewContactsModalBody;
