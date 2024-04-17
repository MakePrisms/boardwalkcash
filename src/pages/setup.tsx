import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Disclaimer from '@/components/Disclaimer';
import { Button, Label, TextInput } from 'flowbite-react';
import { CashuMint } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/useToast';
import { useDispatch } from 'react-redux';
import { addKeyset } from '@/redux/slices/Wallet.slice';

export default function Home() {
   const [mintUrl, setMintUrl] = useState('');
   const [addingMint, setAddingMint] = useState(false);

   const dispatch = useDispatch();
   const router = useRouter();
   const { addToast } = useToast();

   const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();

      setAddingMint(true);

      try {
         const mint = new CashuMint(mintUrl);

         const { keysets } = await mint.getKeys();

         const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

         if (!usdKeyset) {
            addToast("Mint doesn't support USD", 'error');
            return;
         }

         dispatch(addKeyset({ keyset: usdKeyset, url: mintUrl }));

         addToast('Mint added successfully', 'success');

         // Redirect to the wallet page
         handleRedirect();
      } catch (e) {
         console.error(e);
         addToast('Error adding mint', 'error');
      } finally {
         setAddingMint(false);
      }
   };

   const handleRedirect = () => {
      // get the current query params
      const { query } = router;

      // maintain any query params that were passed to the setup page
      // and redirect to the wallet page
      router.push({
         pathname: '/wallet',
         query,
      });
   };

   useEffect(() => {
      // Check if the user has already added a mint
      const keysets = window.localStorage.getItem('keysets');

      if (keysets) {
         handleRedirect();
      }
   }, []);

   return (
      <main className='flex flex-col items-center justify-center mx-auto min-h-screen'>
         <form className='max-w-md' onSubmit={e => handleSubmit(e)}>
            <div className='mb-5'>
               <h2 className='text-3xl underline mb-2'>Add a Mint</h2>
               <p className='text-white'>
                  Cashu mints custody your bitcoin in exchange for ecash tokens. This wallet allows
                  you to custody ecash in your browser and transact with near perfect privacy.
                  Before you add a mint, make sure you are aware of the risks associated and only
                  put in what you can afford to lose! This wallet and Cashu are still experimental.
               </p>
            </div>
            <div className='mb-2 block'>
               <Label htmlFor='mint-url' value='Mint URL' className='text-white text-xl' />
            </div>
            <TextInput
               id='mint-url'
               type='url'
               placeholder='https://mint.example.com'
               required
               value={mintUrl}
               onChange={e => setMintUrl(e.target.value)}
               helperText={
                  <>
                     {/* <p className='text-white mb-4'> */}
                     Search
                     <a
                        href='https://bitcoinmints.com?show=cashu&units=usd'
                        className='ml-1 font-medium hover:underline text-cyan-teal'
                     >
                        bitcoinmints.com
                     </a>{' '}
                     for a Cashu mint that supports USD.
                     {/* </p> */}
                  </>
               }
            />
            <div className='flex justify-between items-center'>
               {' '}
               <div></div> {/* Empty div for spacing */}
               <Button isProcessing={addingMint} type='submit'>
                  Continue
               </Button>
            </div>
         </form>
         <footer className='fixed inset-x-0 bottom-0 text-center p-4 shadow-md flex  flex-col items-center justify-center'>
            <Disclaimer />
         </footer>
      </main>
   );
}
