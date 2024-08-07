import { useEffect, useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { CashuMint } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/util/useToast';
import { Wallet } from '@/types';
import Link from 'next/link';
import { normalizeUrl } from '@/utils/url';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

export const AddMintButton = ({ keysets }: { keysets: { [key: string]: Wallet } }) => {
   const [fetchingMint, setFetchingMint] = useState(false);
   const [mintUrl, setMintUrl] = useState('');
   const [currentMints, setCurrentMints] = useState<string[]>([]);

   const { addToast } = useToast();

   const { addWallet } = useCashuContext();

   useEffect(() => {
      setCurrentMints(Object.values(keysets).map(keyset => keyset.url));
   }, [keysets]);

   const handleAddMint = async () => {
      const url = normalizeUrl(mintUrl);
      const mint = new CashuMint(url);

      if (currentMints.includes(url)) {
         addToast('Mint already added', 'error');
         return;
      }

      try {
         setFetchingMint(true);

         const { keysets } = await mint.getKeys();

         const seenUnits = new Set<string>();

         const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

         if (!usdKeyset) {
            addToast("Mint doesn't support USD", 'error');
            return;
         }

         addWallet(usdKeyset, url);

         setMintUrl('');

         addToast('Mint added successfully', 'success');
      } catch (e) {
         console.error(e);
         addToast(
            'Failed to add mint. Make sure the mint you are using supports Cashu V1',
            'error',
         );
      } finally {
         setFetchingMint(false);
      }
   };

   return (
      <>
         <form className='flex flex-col justify-around mb-5'>
            <h3 className='text-lg mb-2'>Add a Mint</h3>
            <TextInput
               placeholder='Mint URL (https://...)'
               value={mintUrl}
               onChange={e => setMintUrl(e.target.value)}
               helperText={
                  <>
                     Search at{' '}
                     <a
                        className='underline text-cyan-teal'
                        href='https://bitcoinmints.com?show=cashu&units=usd'
                        target='_blank'
                     >
                        bitcoinmints.com
                     </a>
                     . Understand mint{' '}
                     <Link className='underline text-cyan-teal' href={'/mintrisks'} target='_blank'>
                        risks
                     </Link>
                     .
                  </>
               }
            />
            <Button
               isProcessing={fetchingMint}
               className='max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
               onClick={() => handleAddMint()}
            >
               Add
            </Button>
         </form>
      </>
   );
};

export default AddMintButton;
