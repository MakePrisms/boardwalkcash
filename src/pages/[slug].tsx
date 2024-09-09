import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import useContacts from '@/hooks/boardwalk/useContacts';
import { useToast } from '@/hooks/util/useToast';
import { PublicContact } from '@/types';
import { Button } from 'flowbite-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import QRCode from 'qrcode.react';
import React, { useCallback, useEffect } from 'react';
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from '@/redux/slices/UserSlice';

const UserProfilePage = () => {
   const [boardwalkInitialized, setBoardwalkInitialized] = React.useState(false);
   const [user, setUser] = React.useState<PublicContact | null>(null);
   const [localPubkey, setLocalPubkey] = React.useState<string | null>(null);
   const [isLoaded, setIsLoaded] = React.useState(false);
   const [showAddContact, setShowAddContact] = React.useState(false);
   const [addingContact, setAddingContact] = React.useState(false);
   const { addContact, isContactAdded } = useContacts();
   const dispatch = useAppDispatch();

   const router = useRouter();
   const { addToast } = useToast();

   useEffect(() => {
      const username = router.query.slug as string;

      if (!username) {
         return;
      }

      const fetchUser = async () => {
         const res = await fetch(`/api/users/username/${username}`);
         if (res.ok) {
            const user = await res.json();
            setUser(user);
            return user;
         } else {
            if (res.status === 404) {
               console.error('User not found', username);
               router.push('/404/user');
            }
            return null;
         }
      };

      const isBoardwalkInitialized = async () => {
         const localPubkey = window.localStorage.getItem('pubkey');

         if (localPubkey) {
            setBoardwalkInitialized(true);
            setShowAddContact(true);
            setLocalPubkey(localPubkey);
            await dispatch(initializeUser());
            return true;
         }
         return false;
      };

      const loadState = async () => {
         const user = await fetchUser();
         const isInitialized = await isBoardwalkInitialized();

         if (
            (isInitialized && isContactAdded({ pubkey: user.pubkey })) ||
            user.pubkey === window.localStorage.getItem('pubkey')
         ) {
            setShowAddContact(false);
         }

         setIsLoaded(true);
      };

      loadState();
   }, [router.query.slug]);

   const handleAddContact = useCallback(async () => {
      if (!boardwalkInitialized) {
         addToast('Setup Boardwalk at boarwalkcash.com', 'error');
      }

      if (!user) {
         return;
      }

      setAddingContact(true);

      try {
         await addContact(user);
         addToast('Contact added', 'success');
         setShowAddContact(false);
      } catch (e: any) {
         if (e.message === 'Contact already added') {
            setShowAddContact(false);
         }
         addToast(e.message, 'error');
      } finally {
         setAddingContact(false);
      }
   }, [localPubkey, user, boardwalkInitialized, addingContact]);

   if (!isLoaded || !user) {
      return (
         <main
            className='flex flex-col items-center justify-center mx-auto space-y-7'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            {' '}
            <div>Loading...</div>
         </main>
      );
   }

   return (
      <>
         <main
            className='flex flex-col items-center justify-center mx-auto space-y-7'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            <div className='absolute flex top-4 md:top-8 justify-end w-full px-4'>
               <Button className=' btn-bg-blend'>
                  {boardwalkInitialized ? (
                     <Link className='' href='/wallet'>
                        Go to Boardwalk
                     </Link>
                  ) : (
                     <Link className='' href='/setup'>
                        Get Boardwalk
                     </Link>
                  )}
               </Button>
            </div>
            <h1 className='text-3xl'>{user.username}</h1>
            <QRCode value={`${window.location.href}`} size={128} />
            <div className='flex flex-col items-center space-y-6 w-50 mx-auto justify-center'>
               <div className='flex flex-row items-center space-x-6 w-full'>
                  <div className='w-full'>
                     <ClipboardButton
                        toCopy={user.username!}
                        toShow={showAddContact ? 'Copy' : 'Username'}
                        className={`btn-primary hover:!bg-[var(--btn-primary-bg)] h-9  ${showAddContact ? 'w-20' : 'w-full'}`}
                     />
                  </div>
                  {showAddContact && (
                     <div className='w-full'>
                        <Button
                           className='btn-primary w-20 h-9 flex items-center justify-center'
                           isProcessing={addingContact}
                           onClick={handleAddContact}
                        >
                           Add
                        </Button>
                     </div>
                  )}
               </div>
               <div className='flex flex-row items-center space-x-6 w-full'>
                  {/* <EGiftButton className='w-20' contact={user} /> */}
                  <LightningTipButton
                     contact={user}
                     className='w-full h-9 flex items-center justify-center'
                  />
               </div>
            </div>
         </main>
      </>
   );
};

import { GetServerSideProps } from 'next';
import { findContactByUsername } from '@/lib/contactModels';
import LightningTipButton from '@/components/buttons/LightningTipButton';
import EGiftButton from '@/components/buttons/EGiftButton';

export const getServerSideProps: GetServerSideProps = async context => {
   const { slug } = context.params || {};

   const contact = await findContactByUsername(slug as string);

   if (!contact) {
      return {
         props: {
            pageTitle: 'User not found',
            pageDescription: 'User not found. Make sure their username is correct.',
         },
      };
   }

   return {
      props: {
         pageTitle: `${slug}'s Boardwalk`,
      },
   };
};

export default UserProfilePage;
