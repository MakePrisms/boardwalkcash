import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { useToast } from '@/hooks/util/useToast';
import { RootState } from '@/redux/store';
import { PublicContact } from '@/types';
import { Button } from 'flowbite-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import QRCode from 'qrcode.react';
import React from 'react';
import { useSelector } from 'react-redux';

const UserProfilePage = () => {
   const [boardwalkInitialized, setBoardwalkInitialized] = React.useState(false);
   const [user, setUser] = React.useState<PublicContact | null>(null);
   const [isLoaded, setIsLoaded] = React.useState(false);
   const router = useRouter();
   const { addToast } = useToast();
   const { user: activeUser } = useSelector((state: RootState) => state);

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
               // router.push('/404/user');
            }
         }
      };

      const isBoardwalkInitialized = () => {
         const localPubkey = window.localStorage.getItem('pubkey');

         if (localPubkey) {
            setBoardwalkInitialized(true);
         }
      };

      const loadState = async () => {
         await fetchUser();
         isBoardwalkInitialized();
         setIsLoaded(true);
      };

      loadState();
   }, [router.query.slug]);

   if (!isLoaded || !user) {
      return <div>Loading...</div>;
   }

   const handleAddContact = async () => {
      if (!boardwalkInitialized) {
         addToast('Setup Boardwalk at boarwalkcash.com', 'error');
      }

      const res = await fetch(`/api/users/${activeUser.pubkey}`, {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ contact: user.pubkey }),
      });

      if (!res.ok) {
         addToast('Failed to add contact', 'error');
      } else {
         addToast('Contact added', 'success');
      }
   };

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
            className='flex flex-col items-center justify-center mx-auto space-y-5'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            <h1 className='text-3xl'>{user.username}</h1>
            <QRCode value={`${window.location.href}`} size={128} />
            <div className='flex'>
               <ClipboardButton toCopy={user.username!} toShow='Username' />
               {boardwalkInitialized && <Button onClick={handleAddContact}>Add Contact</Button>}
            </div>
         </main>
      </>
   );
};

export default UserProfilePage;
