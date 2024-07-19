import useNwa, { SupportedWallet } from '@/hooks/nostr/useNwa';
import { Button, Label, TextInput } from 'flowbite-react';
import Link from 'next/link';
import { useState } from 'react';

interface ConnectReserveProps {
   handleConnect: (nwc?: string) => void;
   fetchingMint: boolean;
   setNwcUri: (uri: string) => void;
   nwcUri: string;
}

const ConnectReserve = ({
   handleConnect,
   fetchingMint,
   setNwcUri,
   nwcUri,
}: ConnectReserveProps) => {
   const [showManualConnection, setShowManualConnection] = useState(false);
   const { supportedWallets, getNwcUrl } = useNwa();

   const handleNwaConnect = async (wallet: SupportedWallet) => {
      const { nwcUrl } = await getNwcUrl(wallet);
      setNwcUri(nwcUrl);
      handleConnect(nwcUrl);
   };

   const toggleManualConnection = () => {
      setShowManualConnection(!showManualConnection);
   };

   if (showManualConnection) {
      return (
         <form className='flex flex-col justify-around mb-5'>
            <div>
               <Label className='text-white'>
                  Create a Reserve. Learn{' '}
                  <Link className='underline text-cyan-teal' target='_blank' href='/docs/reserve'>
                     more
                  </Link>
               </Label>
               <TextInput
                  placeholder='Enter NWC'
                  onChange={e => setNwcUri(e.target.value)}
                  value={nwcUri}
                  className='mt-1'
               />
            </div>
            <div className='self-end mt-2'>
               <Button
                  className='mt-2 max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
                  onClick={() => handleConnect()}
                  isProcessing={fetchingMint}
               >
                  Create
               </Button>
            </div>
         </form>
      );
   } else {
      return (
         <div className='mb-4'>
            <div className='text-white mb-3'>
               Create a Reserve. Learn{' '}
               <Link className='underline text-cyan-teal' target='_blank' href='/docs/reserve'>
                  more
               </Link>
            </div>
            <div className='flex justify-around'>
               {supportedWallets.map((wallet, index) => {
                  return (
                     <Button
                        onClick={() => handleNwaConnect(wallet)}
                        key={index}
                        className=' max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
                     >
                        {wallet.name}
                     </Button>
                  );
               })}
               <Button
                  className=' max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
                  onClick={toggleManualConnection}
               >
                  NWC
               </Button>
            </div>
         </div>
      );
   }
};

export default ConnectReserve;
