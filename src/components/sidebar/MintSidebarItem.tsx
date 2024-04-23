import { useToast } from '@/hooks/useToast';
import { setMainKeyset } from '@/redux/slices/Wallet.slice';
import { RootState, useAppDispatch } from '@/redux/store';
import { Wallet } from '@/types';
import { Proof } from '@cashu/cashu-ts';
import { Badge, Button, Popover, Sidebar } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

interface MintSidebarItemProps {
   keyset: Wallet;
}

export const MintSidebarItem = ({ keyset }: MintSidebarItemProps) => {
   const [mintBalance, setMintBalance] = useState('0');
   const [swapToMainOpen, setSwapToMainOpen] = useState(false);
   const [setMainOpen, setSetMainOpen] = useState(false);

   const { addToast } = useToast();
   const dispatch = useAppDispatch();
   const balance = useSelector((state: RootState) => state.wallet.balance);

   const handleSetMain = async () => {
      console.log('Setting main keyset', keyset.id);
      await dispatch(setMainKeyset(keyset.id));

      setSetMainOpen(false);
   };

   const handleSwapToMain = () => {
      setSwapToMainOpen(false);
   };

   const handleCopy = () => {
      try {
         navigator.clipboard.writeText(keyset.url);

         addToast('Mint URL copied to clipboard', 'success');
      } catch (e) {
         addToast('Failed to copy mint URL to clipboard', 'error');
      }
   };

   useEffect(() => {
      const allProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];

      const thisProofs = allProofs.filter((proof: any) => proof.id === keyset.id);

      const thisBalanceCents = thisProofs.reduce(
         (acc: number, proof: any) => acc + proof.amount,
         0,
      );

      const thisBalance = (thisBalanceCents / 100).toFixed(2);

      setMintBalance(thisBalance);
   }, [keyset, balance]);

   const formattedMintUrl = () => {
      const mintHostDomain = keyset.url.replace('https://', '');

      return `${mintHostDomain.slice(0, 15)}...${mintHostDomain.slice(-5)}`;
   };

   return (
      <Sidebar.Item className='w-full'>
         <div className='flex flex-col justify-between min-w-full'>
            <div className='flex justify-between'>
               {formattedMintUrl()} <Badge>${mintBalance}</Badge>
            </div>
            <div className='flex justify-between align-middle min-w-max'>
               <Popover
                  open={setMainOpen}
                  content={
                     <div className='w-80 text-sm text-gray-400'>
                        <div className='border-b border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-600 dark:bg-gray-700'>
                           <h3
                              id='set-main-popover'
                              className='font-semibold text-gray-900 dark:text-white'
                           >
                              Set Main
                           </h3>
                        </div>
                        <div className='px-3 py-2 mb-3'>
                           <p className='whitespace-break-spaces break-words'>
                              {`Set ${keyset.url} as main sending and receiving mint?`}
                           </p>
                        </div>
                        <div className='flex justify-around mb-3 mr-3'>
                           <Button onClick={() => setSetMainOpen(false)} color='failure'>
                              Cancel
                           </Button>
                           <Button onClick={handleSetMain} color='success'>
                              Confirm
                           </Button>
                        </div>
                     </div>
                  }
               >
                  <button onClick={() => setSetMainOpen(true)} className='text-xs underline mr-3'>
                     Set Main
                  </button>
               </Popover>
               <Popover
                  open={swapToMainOpen}
                  content={
                     <div className='w-80 text-sm text-gray-400'>
                        <div className='border-b border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-600 dark:bg-gray-700'>
                           <h3
                              id='swap-popover'
                              className='font-semibold text-gray-900 dark:text-white'
                           >
                              Swap to Main
                           </h3>
                        </div>
                        <div className='px-3 py-2'>
                           <p className='whitespace-break-spaces break-words'>
                              Swap all the funds from {keyset.url} to the main mint?
                           </p>
                        </div>
                        <div className='flex justify-around mb-3 mr-3'>
                           <Button onClick={() => setSwapToMainOpen(false)} color='failure'>
                              Cancel
                           </Button>
                           <Button onClick={handleSwapToMain} color='success'>
                              Confirm
                           </Button>
                        </div>
                     </div>
                  }
               >
                  <button
                     onClick={() => setSwapToMainOpen(true)}
                     className='text-xs mr-3 underline'
                  >
                     Swap to Main
                  </button>
               </Popover>
               <button onClick={handleCopy} className='text-xs underline mr-3'>
                  Copy
               </button>
               {keyset.active ? (
                  <Badge className='' color='success'>
                     Main
                  </Badge>
               ) : (
                  <div className='text-transparent'>Inacdve</div>
               )}
            </div>
         </div>
      </Sidebar.Item>
   );
};

export default MintSidebarItem;
