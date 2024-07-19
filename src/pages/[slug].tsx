import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import Head from 'next/head';
import { useRouter } from 'next/router';
import QRCode from 'qrcode.react';
import React from 'react';

const UserProfilePage = () => {
   const [username, setUsername] = React.useState<string | null>(null);
   const [loaded, setLoaded] = React.useState<boolean>(false);
   const router = useRouter();
   React.useEffect(() => {
      const username = router.query.slug as string;
      setUsername(username);
      setLoaded(true);
   });

   if (!loaded) {
      return <div>Loading...</div>;
   }

   return (
      <>
         <Head>
            <title>{username + "'s"} Boardwalk</title>
            <meta name='description' content={'This is the profile page for ' + username + '.'} />
            <meta property='og:title' content={`${username}'s Boardwalk`} />
            <meta property='og:description' content={`${username}'s Boardwalk`} />
         </Head>
         <main
            className='flex flex-col items-center justify-center mx-auto space-y-5'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            <h1 className='text-3xl'>{username}</h1>
            <QRCode value={`${window.location.href}`} size={128} />
            <div>
               <ClipboardButton toCopy={username!} toShow='Username' />
            </div>
         </main>
      </>
   );
};

export default UserProfilePage;
