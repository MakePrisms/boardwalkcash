import useContacts from '@/hooks/boardwalk/useContacts';
import useNostrLogin from '@/hooks/boardwalk/useNostrLogin';
import { setNostrPubkeyAction } from '@/redux/slices/UserSlice';
import { useAppDispatch } from '@/redux/store';
import { DiscoverContactsResponse, PublicContact } from '@/types';
import { shortenString } from '@/utils/formatting';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/20/solid';
import { Modal, Button, Pagination, Spinner } from 'flowbite-react';
import { nip19 } from 'nostr-tools';
import { useEffect, useState } from 'react';

const DiscoverContactsModalBody = () => {
   const [loading, setLoading] = useState(true);
   const [users, setUsers] = useState<DiscoverContactsResponse['users']>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const { discoverContacts, addContact } = useContacts();
   const { logout, nostrPubkey } = useNostrLogin();

   const dispatch = useAppDispatch();

   const usersPerPage = 10;
   const totalPages = Math.ceil(users.length / usersPerPage);

   useEffect(() => {
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

   const handleLogout = async () => {
      if (window.confirm('Are you sure you want to disconnect?')) {
         await logout();
         dispatch(setNostrPubkeyAction(null));
      }
   };

   const getCurrentPageUsers = () => {
      const startIndex = (currentPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      return users.slice(startIndex, endIndex);
   };

   return (
      <>
         <Modal.Body>
            {loading ? (
               <div className='flex items-center justify-center space-x-4'>
                  <p>Fetching nostr contacts...</p>
                  <Spinner size='sm' />
               </div>
            ) : users.length === 0 ? (
               <p className='text-center'>No new contacts to add</p>
            ) : (
               <div className='space-y-4'>
                  {getCurrentPageUsers().map((user, index) => (
                     <div
                        key={user.pubkey}
                        className={
                           index !== getCurrentPageUsers().length - 1 ? 'pb-2 border-b' : ''
                        }
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
                                 size={'xs'}
                                 className='btn-primary'
                                 as='a'
                                 href={`https://njump.me/${nip19.npubEncode(user.nostrPubkey!)}`}
                                 target='_blank'
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
         <Modal.Footer>
            <div className='flex items-center justify-between w-full text-sm'>
               <div>
                  Connected as{' '}
                  <a
                     className='underline'
                     target='_blank'
                     href={`https://njump.me/${nip19.npubEncode(nostrPubkey!)}`}
                  >
                     {shortenString(nip19.npubEncode(nostrPubkey!), 10)}
                  </a>
               </div>
               <button onClick={handleLogout}>
                  <ArrowRightStartOnRectangleIcon className='h-5 w-5 text-red-600' />
               </button>
            </div>
         </Modal.Footer>
      </>
   );
};

export default DiscoverContactsModalBody;
