import { useToast } from '@/hooks/util/useToast';
import { Wallet } from '@/types';
import { Badge } from 'flowbite-react';
import { useEffect, useState } from 'react';
import ProcessingSwapModal from '@/components/modals/ProcessingCashuSwap/ProcessingSwap';
import SetMainButton from './SetMainButton';
import SwapToMainButton from './SwapToMainButton';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { formatUnit } from '@/utils/formatting';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import { useProofStorage } from '@/hooks/cashu/useProofStorage';
import { getDecodedToken, getEncodedToken, getEncodedTokenV4 } from '@cashu/cashu-ts';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';

interface MintSidebarItemProps {
   keyset: Wallet;
}

export const MintSidebarItem = ({ keyset }: MintSidebarItemProps) => {
   const [mintBalance, setMintBalance] = useState('0');
   const [swapToMainOpen, setSwapToMainOpen] = useState(false);
   const [setMainOpen, setSetMainOpen] = useState(false);
   const [swapping, setSwapping] = useState(false);

   const { swapToActiveWallet, balanceByWallet } = useCashu();
   const { addToast } = useToast();
   const { setToMain, getWallet } = useCashuContext();
   const { getAllProofsByKeysetId, removeProofs } = useProofStorage();
   const { mintlessClaimToken } = useMintlessMode();
   const user = useSelector((state: RootState) => state.user);

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

      if (user.receiveMode === 'mintless') {
         const proofs = getAllProofsByKeysetId(thisWallet.keys.id);
         const token = getDecodedToken(
            getEncodedTokenV4({
               token: [{ proofs, mint: thisWallet.mint.mintUrl }],
               unit: thisWallet.keys.unit,
            }),
         );
         return mintlessClaimToken(thisWallet, token)
            .then(({ amountMeltedSat }) => {
               addToast(
                  `Claimed ${formatUnit(amountMeltedSat, 'sat')} to your Lightning Address`,
                  'success',
               );
               removeProofs(proofs);
            })
            .catch((error: any) => {
               console.error('Error claiming token:', error);
               const msg = error.message || 'Failed to claim token';
               addToast(msg, 'error');
            })
            .finally(() => setSwapping(false));
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

   // useEffect(() => {
   //    const thisBalanceUnit = balanceByWallet[keyset.id] || 0;

   //    console.log('thisBalanceUnit', thisBalanceUnit);

   //    if (keyset.keys.unit === 'sat') {
   //       setMintBalance(thisBalanceUnit.toString());
   //    } else if (keyset.keys.unit === 'usd') {
   //       /* convert from cents to dollars */
   //       const thisBalance = (thisBalanceUnit / 100).toFixed(2);
   //       setMintBalance(thisBalance.toString());
   //    }
   // }, [keyset, balanceByWallet]);

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
                  {formattedMintUrl()}{' '}
                  <Badge>{formatUnit(balanceByWallet[keyset.id] || 0, keyset.keys.unit)}</Badge>
               </div>
               <div className='flex justify-between align-middle min-w-max'>
                  <div className='flex space-x-4'>
                     <button onClick={handleCopy} className='text-xs underline'>
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
                  </div>

                  <div className='flex space-x-1'>
                     {keyset.active ? (
                        <Badge className='' color='success'>
                           Main
                        </Badge>
                     ) : (
                        <div className='text-transparent'></div>
                     )}
                     {keyset.isReserve && (
                        <Badge className='mr-2' color='purple'>
                           Reserve
                        </Badge>
                     )}
                  </div>
               </div>
            </div>
         </>
      </>
   );
};

export default MintSidebarItem;
