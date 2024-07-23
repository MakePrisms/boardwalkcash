import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { useToast } from '@/hooks/util/useToast';
import { ContactData } from '@/lib/userModels';
import { PublicContact } from '@/types';
import { Button } from 'flowbite-react';
import Head from 'next/head';
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

      if (user.pubkey === localPubkey) {
         addToast('You cannot add yourself as a contact', 'error');
         setShowAddContact(false);
         return;
      }

      setAddingContact(true);

      const res = await fetch(`/api/users/${localPubkey}`, {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            linkedUserPubkey: user.pubkey,
         } as ContactData),
      });

      if (!res.ok) {
         if (res.status === 409) {
            addToast('Contact already added', 'error');
            setShowAddContact(false);
         } else {
            addToast('Failed to add contact', 'error');
         }
      } else {
         addToast('Contact added', 'success');
         setShowAddContact(false);
      }

      setAddingContact(false);
   }, [localPubkey, user, boardwalkInitialized, addingContact]);

   if (!isLoaded || !user) {
      return <div>Loading...</div>;
   }

   return (
      <>
         <Head>
            <title>{user.username + "'s"} Boardwalk</title>
            <meta
               name='description'
               content={'This is the profile page for ' + user.username + '.'}
            />
            <meta property='og:title' content={`${user.username}'s Boardwalk`} />
            <meta property='og:description' content={`${user.username}'s Boardwalk`} />
         </Head>
         <main
            className='flex flex-col items-center justify-center mx-auto space-y-7'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            <h1 className='text-3xl'>{user.username}</h1>
            <QRCode value={`${window.location.href}`} size={128} />
            <div className='flex flex-row items-center space-x-6'>
               <ClipboardButton toCopy={user.username!} toShow='Username' />
               {showAddContact && (
                  <Button isProcessing={addingContact} onClick={handleAddContact}>
                     Add Contact
                  </Button>
               )}
            </div>
         </main>
      </>
   );
};

export default UserProfilePage;
