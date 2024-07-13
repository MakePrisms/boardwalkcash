import { useToast } from '@/hooks/useToast';
import { Wallet } from '@/types';
import { Badge, Button, Popover, Sidebar } from 'flowbite-react';
import { useEffect, useState } from 'react';
import ProcessingSwapModal from './ProcessingSwapModal';
import SetMainButton from './SetMainButton';
import SwapToMainButton from './SwapToMainButton';
import { useCashu2 } from '@/hooks/useCashu2';
import { useCashuContext } from '@/contexts/cashuContext';

interface MintSidebarItemProps {
   keyset: Wallet;
}

export const MintSidebarItem = ({ keyset }: MintSidebarItemProps) => {
   const [mintBalance, setMintBalance] = useState('0');
   const [swapToMainOpen, setSwapToMainOpen] = useState(false);
   const [setMainOpen, setSetMainOpen] = useState(false);
   const [swapping, setSwapping] = useState(false);

   const { swapToActiveWallet, getWallet, balanceByWallet } = useCashu2();
   const { addToast } = useToast();
   const { setToMain } = useCashuContext();

   const handleSetMain = async () => {
      setToMain(keyset.id);

      setSetMainOpen(false);
   };

   const handleSwapToMain = () => {
      setSwapping(true);

      setSwapToMainOpen(false);

      // TODO: I should be able to pass the wallet into this component
      const thisWallet = getWallet(keyset.id);

      if (!thisWallet) {
         addToast('Failed to find wallet for keyset', 'error');
         return;
      }

      swapToActiveWallet(thisWallet, { max: true }).finally(() => setSwapping(false));
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
      const thisBalanceCents = balanceByWallet[keyset.id] || 0;

      const thisBalance = (thisBalanceCents / 100).toFixed(2);

      setMintBalance(thisBalance.toString());
   }, [keyset, balanceByWallet]);

   const formattedMintUrl = () => {
      const mintHostDomain = keyset.url.replace('https://', '');

      return `${mintHostDomain.slice(0, 15)}...${mintHostDomain.slice(-5)}`;
   };

   return (
      <>
         <ProcessingSwapModal isSwapping={swapping} />
         <>
            <div className='flex flex-col justify-between min-w-full mb-5'>
               <div className='flex justify-between'>
                  {formattedMintUrl()} <Badge>${mintBalance}</Badge>
               </div>
               <div className='flex justify-between align-middle min-w-max'>
                  <button onClick={handleCopy} className='text-xs underline mr-3'>
                     Copy
                  </button>
                  {!keyset.active && (
                     <>
                        <SetMainButton
                           keyset={keyset}
                           setSetMainOpen={setSetMainOpen}
                           setMainOpen={setMainOpen}
                           handleSetMain={handleSetMain}
                        />
                        <SwapToMainButton
                           swapToMainOpen={swapToMainOpen}
                           mintUrl={keyset.url}
                           setSwapToMainOpen={setSwapToMainOpen}
                           handleSwapToMain={handleSwapToMain}
                           className='text-xs'
                        />
                     </>
                  )}
                  {keyset.active ? (
                     <Badge className='' color='success'>
                        Main
                     </Badge>
                  ) : (
                     <div className='text-transparent'>Inacdve</div>
                  )}
               </div>
            </div>
         </>
      </>
   );
};

export default MintSidebarItem;
