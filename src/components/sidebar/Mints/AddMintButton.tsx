import { useEffect, useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { CashuMint } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/util/useToast';
import { Currency, Wallet } from '@/types';
import Link from 'next/link';
import { normalizeUrl } from '@/utils/url';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

type Props = {
   keysets: { [key: string]: Wallet };
   currency: Currency;
}

export const AddMintButton = ({ keysets, currency }: Props) => {
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

         const activeKeys = await mint.getKeys();

         // TODO: more like initWallets
         addWallet(activeKeys, url, { currencies: ['usd', 'sat'] });

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
            <TextInput
               placeholder='Mint URL (https://...)'
               value={mintUrl}
               onChange={e => setMintUrl(e.target.value)}
               helperText={
                  <>
                     Search at{' '}
                     <a
                        className='underline text-cyan-teal'
                        href={`https://bitcoinmints.com?show=cashu&units=${currency}`}
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
               className='max-w-fit self-end btn-primary'
               onClick={() => handleAddMint()}
            >
               Add
            </Button>
         </form>
      </>
   );
};

export default AddMintButton;
