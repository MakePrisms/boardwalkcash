import { useCashu } from '@/hooks/useCashu';
import { useToast } from '@/hooks/useToast';
import { setBalance, setMainKeyset } from '@/redux/slices/Wallet.slice';
import { RootState, useAppDispatch } from '@/redux/store';
import { Wallet } from '@/types';
import { Proof } from '@cashu/cashu-ts';
import { Badge, Button, Popover, Sidebar } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ProcessingSwapModal from './ProcessingSwapModal';
import SetMainButton from './SetMainButton';
import SwapToMainButton from './SwapToMainButton';

interface MintSidebarItemProps {
   keyset: Wallet;
}

export const MintSidebarItem = ({ keyset }: MintSidebarItemProps) => {
   const [mintBalance, setMintBalance] = useState('0');
   const [swapToMainOpen, setSwapToMainOpen] = useState(false);
   const [setMainOpen, setSetMainOpen] = useState(false);
   const [swapping, setSwapping] = useState(false);

   const { swapToMain } = useCashu();
   const { addToast } = useToast();
   const dispatch = useAppDispatch();
   const balance = useSelector((state: RootState) => state.wallet.balance);

   const handleSetMain = async () => {
      await dispatch(setMainKeyset(keyset.id));

      setSetMainOpen(false);
   };

   const handleSwapToMain = () => {
      setSwapping(true);

      setSwapToMainOpen(false);

      const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];

      const proofsForThisKeyset = proofs.filter((proof: any) => proof.id === keyset.id);

      swapToMain(
         {
            id: keyset.id,
            url: keyset.url,
            unit: keyset.keys.unit,
            keys: keyset.keys,
         },
         proofsForThisKeyset,
      )
         .then(() => {
            console.log('Swapped to main');
            const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
            const newProofs = proofs.filter(
               p => !proofsForThisKeyset.some(p2 => p2.secret === p.secret),
            );
            window.localStorage.setItem('proofs', JSON.stringify(newProofs));
            dispatch(setBalance({ usd: newProofs.reduce((acc, p) => acc + p.amount, 0) }));
         })
         .finally(() => {
            setSwapping(false);
         });
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
