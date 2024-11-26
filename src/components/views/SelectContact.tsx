import ContactTableRowItem from '../modals/ContactsModal/ContactTableRowItem';
import useContacts from '@/hooks/boardwalk/useContacts';
import { UserPlusIcon } from '@heroicons/react/20/solid';
import { Button, Table, TextInput } from 'flowbite-react';
import { useMemo, useState } from 'react';
import { PublicContact } from '@/types';
import { useToast } from '@/hooks/util/useToast';
import useGifts from '@/hooks/boardwalk/useGifts';
import { getMsgFromUnknownError } from '@/utils/error';
import { contactsTableTheme } from '@/themes/tableThemes';

const SelectContact = ({
   onSelectContact,
}: {
   onSelectContact: (contact?: PublicContact) => void;
}) => {
   const [currentView, setCurrentView] = useState<'select' | 'add'>('select');
   const [addingContact, setAddingContact] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [addContactInput, setAddContactInput] = useState('');
   const { sortedContacts, user, addContact, fetchContactByUsername, isContactAdded } =
      useContacts();
   const { addToast } = useToast();
   const { loadUserCustomGifts } = useGifts();

   const filteredContacts = useMemo(() => {
      const f = [...sortedContacts, user].filter(contact =>
         contact.username?.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      return f;
   }, [searchTerm, sortedContacts, user]);

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
         await addContact(contact);
         await loadUserCustomGifts(contact.pubkey);

         addToast('Contact added', 'success');
         setAddContactInput('');
         setCurrentView('select');
      } catch (e) {
         const msg = getMsgFromUnknownError(e, 'Failed to add contact');
         addToast(msg, 'error');
      } finally {
         setAddingContact(false);
      }
   };

   return (
      <div className='flex flex-col items-center justify-start space-y-4 w-full h-full'>
         {currentView === 'select' ? (
            <div className='flex flex-col h-full w-full'>
               <div className='flex justify-between items-center mb-3 w-full'>
                  <TextInput
                     placeholder='Search contacts'
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className='w-full'
                  />
                  <button className='ml-3' onClick={() => setCurrentView('add')}>
                     <UserPlusIcon className='h-6 w-6 text-gray-600' />
                  </button>
               </div>
               <div className='no-scrollbar overflow-y-auto w-full'>
                  <Table className='mb-24' theme={contactsTableTheme}>
                     <Table.Body>
                        {filteredContacts.length > 0 && (
                           <>
                              {filteredContacts.map((contact, index) => (
                                 <ContactTableRowItem
                                    key={index}
                                    contact={contact}
                                    mode={'select'}
                                    handleContactClick={onSelectContact}
                                    userPubkey={user.pubkey}
                                 />
                              ))}
                           </>
                        )}
                     </Table.Body>
                  </Table>
               </div>
               <div className='mt-auto self-end'>
                  <Button
                     onClick={() => onSelectContact(undefined)}
                     color='primary'
                     className='btn-primary'
                  >
                     Skip
                  </Button>
               </div>
            </div>
         ) : (
            <form onSubmit={handleAddContact} className='w-full'>
               <div>
                  <TextInput
                     placeholder='Username'
                     className='w-full mb-6'
                     value={addContactInput}
                     onChange={e => setAddContactInput(e.target.value.toLowerCase())}
                  />
               </div>
               <div className='flex justify-between'>
                  <Button color='failure' onClick={() => setCurrentView('select')}>
                     Cancel
                  </Button>
                  <Button type='submit' isProcessing={addingContact}>
                     Add
                  </Button>
               </div>
            </form>
         )}
      </div>
   );
};

export default SelectContact;
