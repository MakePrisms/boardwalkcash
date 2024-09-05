import useContacts from '@/hooks/boardwalk/useContacts';
import { DiscoverContactsResponse, PublicContact } from '@/types';
import { Modal, Button, Pagination } from 'flowbite-react';
import { nip19 } from 'nostr-tools';
import { useEffect, useState } from 'react';

const DiscoverContactsModalBody = () => {
   const [loading, setLoading] = useState(true);
   const [users, setUsers] = useState<DiscoverContactsResponse['users']>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const { discoverContacts, addContact } = useContacts();

   const usersPerPage = 10;
   const totalPages = Math.ceil(users.length / usersPerPage);

   useEffect(() => {
      console.log('discoverContacts');
      discoverContacts().then(users => {
         setUsers(users);
         setLoading(false);
      });
   }, [discoverContacts]);

   const handleAddContact = async (user: PublicContact) => {
      try {
         await addContact(user);
         /* remove user from list of users to discover */
         setUsers(users.filter(u => u.pubkey !== user.pubkey));
      } catch (error) {
         console.error('Failed to add contact:', error);
      }
   };

   const handleViewNostrProfile = (nostrPubkey: string) => {
      const npub = nip19.npubEncode(nostrPubkey);
      window.open(`https://njump.me/${npub}`, '_blank');
   };

   const getCurrentPageUsers = () => {
      const startIndex = (currentPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      return users.slice(startIndex, endIndex);
   };

   return (
      <Modal.Body>
         {loading ? (
            'Loading...'
         ) : users.length === 0 ? (
            'No new contacts to add'
         ) : (
            <div className='space-y-4'>
               {getCurrentPageUsers().map((user, index) => (
                  <div
                     key={user.pubkey}
                     className={index !== getCurrentPageUsers().length - 1 ? 'pb-2 border-b' : ''}
                  >
                     <div className='flex items-center justify-between'>
                        <span>{user.username}</span>
                        <div className='space-x-2 flex'>
                           <Button
                              onClick={() =>
                                 handleAddContact({
                                    pubkey: user.pubkey,
                                    username: user.username!,
                                    createdAt: new Date(),
                                 })
                              }
                              className='btn-primary'
                              size={'xs'}
                           >
                              Add
                           </Button>
                           <Button
                              onClick={() => handleViewNostrProfile(user.nostrPubkey)}
                              size={'xs'}
                              className='btn-primary'
                           >
                              View
                           </Button>
                        </div>
                     </div>
                  </div>
               ))}
               {users.length > usersPerPage && (
                  <div className='flex justify-center mt-4'>
                     <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        layout='navigation'
                     />
                  </div>
               )}
            </div>
         )}
      </Modal.Body>
   );
};

export default DiscoverContactsModalBody;
