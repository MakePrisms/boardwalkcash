import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Label, TextInput } from 'flowbite-react';
import { CashuMint } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/util/useToast';
import Image from 'next/image';
import { Currency, NWAEventContent } from '@/types';
import { Relay, finalizeEvent, generateSecretKey, getPublicKey, nip04 } from 'nostr-tools';
import { initializeUser } from '@/redux/slices/UserSlice';
import { useAppDispatch } from '@/redux/store';
import { assembleLightningAddress } from '@/utils/lud16';
import { normalizeUrl } from '@/utils/url';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

const FirstPage = ({ nextPage }: { nextPage: (pgNum: number) => void }) => {
   return (
      <>
         <main className='flex flex-col md:flex-row items-center justify-center mx-auto min-h-screen'>
            <div className='flex flex-col md:flex-row items-center justify-center'>
               <Image
                  className='md:mr-10'
                  src='/BoardwalkSquareWithText.png'
                  alt='Boardwalk Cash'
                  width={250}
                  height={250}
               />
               <div className='md:max-w-72 flex flex-col p-3 items-end'>
                  <div>
                     <p className='mb-5'>
                        Boardwalk Cash is the easiest way to send and receive cash instantly.
                     </p>
                  </div>
                  <div>
                     <Button className='mr-4' onClick={() => nextPage(2)}>
                        Continue
                     </Button>
                  </div>
               </div>
            </div>
         </main>
      </>
   );
};

const WarningPage = ({ nextPage }: { nextPage: (pgNum: number) => void }) => {
   return (
      <main className='flex flex-col md:flex-row items-center justify-center mx-auto min-h-screen'>
         <div className='w-full md:w-1/2 space-y-4 p-5'>
            <h2 className='underline text-2xl'>Warning!</h2>
            <p>
               Boardwalk Cash is a self-custodial wallet that enables you to manage payments on your
               own device.
            </p>
            <p>
               Boardwalk Cash supports ecash wallet functionality specified in the Cashu protocol.
               Boardwalk Cash does not offer mint functionality and users are required to choose
               their own mints which serve as third-party custodians. Ecash tokens and private keys
               are stored on your device and Boardwalk Cash has no access to or backup of these
               items.
            </p>
            <p>
               Boardwalk Cash supports Lightning payment functionality specified in the Nostr Wallet
               Connect specification for sending payments and the LNURL Lightning Address
               specification for receiving payments. The NWC access tokens are stored on your device
               and Boardwalk Cash has no access to or backup of the tokens.
            </p>
            <p>
               Boardwalk Cash is in early BETA! We hold no responsibility for people losing access
               to funds. Use at your own risk!
            </p>
            <p>
               Boardwalk Cash is an experimental wallet based on the Cashu, Nostr and LNURL
               protocols which are all still extremely early in development and subject to changes
               without warning.
            </p>
            <p>
               Boardwalk Cash operates on your browser and all information is stored on the local
               storage of your browser on your device. The ecash and NWC tokens are bearer tokens,
               which means if you lose access to your tokens, there is no way to recover them. You
               should not use a private window, or the cache might get cleared. Also, before
               deleting your browser history or cache, you should backup your tokens.
            </p>
            <p>
               Terms of service can be found at{' '}
               <a className='text-cyan-teal underline' href='https://www.makeprisms.com/terms'>
                  https://www.makeprisms.com/terms
               </a>
            </p>
            <div className='flex justify-end'>
               <Button onClick={() => nextPage(3)}>Continue</Button>
            </div>
         </div>
      </main>
   );
};

export default function Home() {
   const [mintUrl, setMintUrl] = useState('');
   const [addingMint, setAddingMint] = useState(false);
   const [currentSetupStep, setCurrentSetupStep] = useState(1);

   const dispatch = useAppDispatch();
   const router = useRouter();
   const { addToast } = useToast();
   const { addWallet } = useCashuContext();

   const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();

      let url = normalizeUrl(mintUrl);

      setAddingMint(true);

      try {
         const mint = new CashuMint(url);

         const activeKeysets = await mint.getKeys();

         const supportsUsd = activeKeysets.keysets.some(k => k.unit === Currency.USD);
         const supportsSat = activeKeysets.keysets.some(k => k.unit === Currency.SAT);

         if (!supportsSat && !supportsUsd) {
            throw new Error('Mint does not support USD or BTC');
         }

         addWallet(activeKeysets, url, {
            activeUnit: supportsUsd ? Currency.USD : Currency.SAT,
            currencies: ['usd', 'sat'],
         });

         addToast('Mint added successfully', 'success');

         let params = new URL(document.location.href).searchParams;

         let nwa = params.get('nwa');

         if (nwa) {
            handleNwa(nwa);
            return;
         }

         // Redirect to the wallet page
         handleRedirect();
      } catch (e: any) {
         console.error(e);
         addToast('Error adding mint' + e.message || '', 'error');
      } finally {
         setAddingMint(false);
      }
   };

   const handleNwa = async (nwa: string) => {
      await dispatch(initializeUser());

      if (nwa) {
         // Decode the nwa parameter
         let decodedNwa = decodeURIComponent(nwa);

         // remove the prefix nostr+walletauth://
         decodedNwa = decodedNwa.replace('nostr+walletauth://', '');

         // Extract the appPublicKey from the decoded NWA string
         const [appPublicKey, queryParams] = decodedNwa.split('?');

         // Parse the query parameters
         let queryParamsObj = new URLSearchParams(queryParams);

         // Extract each value
         const appRelay = queryParamsObj.get('relay'); // relay to communicate with the app
         const secret = queryParamsObj.get('secret'); // secret generated by app
         const requiredCommands = queryParamsObj.get('required_commands') || '';
         const budget = queryParamsObj.get('budget');
         const identity = queryParamsObj.get('identity');

         if (!appRelay) {
            console.log('No relay found');
            return;
         }

         if (!secret) {
            throw new Error('No secret found');
         }

         const relay = await Relay.connect(appRelay);

         let nwaSecretKey = generateSecretKey();
         let nwaPubkey = getPublicKey(nwaSecretKey);
         // encode secret as hex
         const hexEncodedSecretKey = Buffer.from(nwaSecretKey).toString('hex');
         // save appPublicKey to localStorage
         window.localStorage.setItem('appPublicKey', appPublicKey);
         // save nwa object wth appPublicKey pk and sk to localStorage
         window.localStorage.setItem(
            'nwa',
            JSON.stringify({ appPublicKey, nwaPubkey, nwaSecretKey: hexEncodedSecretKey }),
         );

         const pubkey = window.localStorage.getItem('pubkey');

         const content: NWAEventContent = {
            secret: secret,
            commands: [...requiredCommands.split(',')],
            relay: appRelay,
         };

         if (pubkey) {
            content.lud16 = `${assembleLightningAddress(pubkey, window.location.host)}`;
         }

         const encryptedContent = await nip04.encrypt(
            nwaSecretKey,
            appPublicKey,
            JSON.stringify(content),
         );

         let eventTemplate = {
            kind: 33194,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['d', appPublicKey]],
            content: encryptedContent,
         };

         // this assigns the pubkey, calculates the event id and signs the event in a single step
         const signedEvent = finalizeEvent(eventTemplate, nwaSecretKey);
         await relay.publish(signedEvent);

         relay.close();

         // redirect to home page
         router.push('/wallet?just_connected=true');
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

   if (currentSetupStep === 1) {
      return <FirstPage nextPage={setCurrentSetupStep} />;
   }

   if (currentSetupStep === 2) {
      return <WarningPage nextPage={setCurrentSetupStep} />;
   }

   return (
      <main className='flex flex-col items-center justify-center mx-auto min-h-screen'>
         <form className='max-w-md p-5 mb-5' onSubmit={e => handleSubmit(e)}>
            <div className='mb-5'>
               <h2 className='text-2xl underline mb-2'>Add a Mint</h2>
               <p className='text-white'>
                  Boardwalk Cash requires adding a mint. Mints issue ecash tokens and are
                  responsible for providing validation and liquidity. Before you add a mint, make
                  sure you are aware of the risks associated with the specific mint and only put in
                  what you can afford to lose! This wallet, most mints and the Cashu protocol are
                  still experimental.
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
                     Search{' '}
                     <a
                        href='https://bitcoinmints.com?show=cashu'
                        className='ml-1 font-medium hover:underline text-cyan-teal'
                        target='__blank'
                     >
                        bitcoinmints.com
                     </a>{' '}
                     for a Cashu mint that supports USD, or add the{' '}
                     <button
                        type='button'
                        className='ml-1 font-medium hover:underline text-cyan-teal'
                        onClick={() => setMintUrl('https://stablenut.umint.cash')}
                     >
                        top-rated mint
                     </button>
                     .
                  </>
               }
            />
            <div className='flex justify-between items-center mt-3'>
               {' '}
               <div></div> {/* Empty div for spacing */}
               <Button isProcessing={addingMint} type='submit' className='btn-primary'>
                  Continue
               </Button>
            </div>
         </form>
      </main>
   );
}
