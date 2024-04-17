import { useState } from 'react';
import { Button, Sidebar, TextInput } from 'flowbite-react';
import { CashuMint } from '@cashu/cashu-ts';
import { useAppDispatch } from '@/redux/store';
import { addKeyset } from '@/redux/slices/Wallet.slice';

export const AddMintButton = () => {
   const [mintUrl, setMintUrl] = useState('');

   const dispatch = useAppDispatch();

   const handleAddMint = async () => {
      const mint = new CashuMint(mintUrl);
      const { keysets } = await mint.getKeys();

      keysets.forEach(keyset => {
         dispatch(addKeyset({ keyset, url: mintUrl }));
      });
   };

   return (
      <>
         <TextInput
            placeholder='Mint URL'
            value={mintUrl}
            onChange={e => setMintUrl(e.target.value)}
         />
         <Sidebar.Item onClick={() => handleAddMint()}>Add Mint</Sidebar.Item>;
      </>
   );
};

export default AddMintButton;
