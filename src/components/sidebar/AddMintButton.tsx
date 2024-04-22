import { useEffect, useState } from 'react';
import { Button, Sidebar, TextInput } from 'flowbite-react';
import { CashuMint } from '@cashu/cashu-ts';
import { useAppDispatch } from '@/redux/store';
import { addKeyset } from '@/redux/slices/Wallet.slice';
import { useToast } from '@/hooks/useToast';
import { Wallet } from '@/types';

export const AddMintButton = ({ keysets }: { keysets: { [key: string]: Wallet } }) => {
   const [fetchingMint, setFetchingMint] = useState(false);
   const [mintUrl, setMintUrl] = useState('');
   const [currentMints, setCurrentMints] = useState<string[]>([]);

   const { addToast } = useToast();

   const dispatch = useAppDispatch();

   useEffect(() => {
      setCurrentMints(Object.values(keysets).map(keyset => keyset.url));
   }, [keysets]);

   const handleAddMint = async () => {
      const mint = new CashuMint(mintUrl);

      if (currentMints.includes(mintUrl)) {
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

         dispatch(addKeyset({ keyset: usdKeyset, url: mintUrl }));

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
         <div className='flex flex-col justify-around'>
            <h3 className='text-black text-lg mb-2'>Add a Mint</h3>
            <TextInput
               placeholder='Mint URL'
               value={mintUrl}
               onChange={e => setMintUrl(e.target.value)}
               helperText='Enter the URL of the mint you would like to add.'
            />
            <Button
               isProcessing={fetchingMint}
               className='max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
               onClick={() => handleAddMint()}
            >
               Add
            </Button>
         </div>
      </>
   );
};

export default AddMintButton;
