import { useNDK } from '@/hooks/useNDK';
import { useRemoteMintSigner } from '@/hooks/useRemoteMintSigner';
import { useToast } from '@/hooks/useToast';
import { addKeyset } from '@/redux/slices/Wallet.slice';
import { Button, Label, TextInput } from 'flowbite-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

const mintProviderURL = 'https://mint.boardwalkcash.com';
// const mintProviderURL = 'http://localhost:5019';

const ConnectWalletSetting = () => {
   const [nwcUrl, setNwcUrl] = useState('');

   const dispatch = useDispatch();
   const { createSigner } = useRemoteMintSigner();
   const { generateNip98Header } = useNDK();
   const { addToast } = useToast();

   const connected = false;

   const handleConnect = async () => {
      console.log('Connect to', nwcUrl);
      const { connectionToken, keysetId, publicKeys } = createSigner();
      console.log('Connection token:', connectionToken);

      const createMintPayload = {
         name: 'Boarwalk Mint',
         units: 'usd',
         backend: {
            data: {
               uri: nwcUrl,
            },
         },
         signers: [
            { uri: connectionToken, unit: 'usd', keysetId, publicKeys: JSON.stringify(publicKeys) },
         ],
         description: 'Mint created by boardwalkcash.com',
         longDescription:
            'This mint was created by boardwalkcash.com and is only capable of swapping and melting tokens.',
      };

      console.log('Create mint payload:', createMintPayload);

      const authHeader = await generateNip98Header(`${mintProviderURL}/mints`, 'POST', undefined);

      const response = await fetch(`${mintProviderURL}/mints`, {
         method: 'POST',
         headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(createMintPayload),
      });

      if (!response.ok) {
         alert(`Failed to create mint. ${response.statusText}`);
         return;
      }

      const mint = await response.json();

      const mintUrl = `${mintProviderURL}/${mint.id}`;

      dispatch(
         addKeyset({ keyset: { unit: 'usd', id: keysetId, keys: publicKeys }, url: mintUrl }),
      );

      console.log('mint: , mint', mint);

      addToast('Mint created successfully', 'success');
   };

   return (
      <>
         {connected ? (
            <div>Already connected. Update connection?</div>
         ) : (
            <form className='flex flex-col justify-around mb-5'>
               <div>
                  <Label className='text-white'>NWC URL</Label>
                  <TextInput
                     placeholder='nostr+walletconnect://...'
                     onChange={e => setNwcUrl(e.target.value)}
                     value={nwcUrl}
                  />
               </div>
               <Button
                  className='mt-2 max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
                  onClick={handleConnect}
               >
                  Connect
               </Button>
            </form>
         )}
      </>
   );
};

export default ConnectWalletSetting;
