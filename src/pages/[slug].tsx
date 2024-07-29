import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import useContacts from '@/hooks/boardwalk/useContacts';
import { useToast } from '@/hooks/util/useToast';
import { ContactData } from '@/lib/userModels';
import { PublicContact } from '@/types';
import { Button } from 'flowbite-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import QRCode from 'qrcode.react';
import React, { useCallback } from 'react';

const UserProfilePage = () => {
   const [boardwalkInitialized, setBoardwalkInitialized] = React.useState(false);
   const [user, setUser] = React.useState<PublicContact | null>(null);
   const [localPubkey, setLocalPubkey] = React.useState<string | null>(null);
   const [isLoaded, setIsLoaded] = React.useState(false);
   const [showAddContact, setShowAddContact] = React.useState(false);
   const [addingContact, setAddingContact] = React.useState(false);
   const { addContact } = useContacts();

   const router = useRouter();
   const { addToast } = useToast();

   React.useEffect(() => {
      const username = router.query.slug as string;

      if (!username) {
         return;
      }

      const fetchUser = async () => {
         const res = await fetch(`/api/users/username/${username}`);
         if (res.ok) {
            const user = await res.json();
            setUser(user);
         } else {
            if (res.status === 404) {
               console.error('User not found', username);
               router.push('/404/user');
            }
         }
      };

      const isBoardwalkInitialized = () => {
         const localPubkey = window.localStorage.getItem('pubkey');

         if (localPubkey) {
            setBoardwalkInitialized(true);
            setShowAddContact(true);
            setLocalPubkey(localPubkey);
         }
      };

      const loadState = async () => {
         await fetchUser();
         isBoardwalkInitialized();

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
            <Button
               color={'secondary'}
               className='absolute top-4 right-4 md:right-8 md:top-8 btn-bg-blend'
            >
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
            <h1 className='text-3xl'>{user.username}</h1>
            <QRCode value={`${window.location.href}`} size={128} />
            <div className='flex flex-row items-center space-x-6'>
               <ClipboardButton toCopy={user.username!} toShow='Username' className='btn-primary' />
               {showAddContact && (
                  <Button
                     className='btn-primary'
                     isProcessing={addingContact}
                     onClick={handleAddContact}
                  >
                     Add Contact
                  </Button>
               )}
            </div>
         </main>
      </>
   );
};

import { GetServerSideProps } from 'next';
import { findContactByUsername } from '@/lib/contactModels';

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
