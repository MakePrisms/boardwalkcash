import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useToast } from '@/hooks/util/useToast';
import { EcashTransaction, TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { RootState, useAppDispatch } from '@/redux/store';
import { initializeWallet, isTokenSpent, proofsLockedTo } from '@/utils/cashu';
import { formatSats } from '@/utils/formatting';
import { Token, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { Spinner } from 'flowbite-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

interface ClaimTokenButtonProps {
   token: Token;
   clearNotification: () => void;
}

const ClaimTokenButton = ({ token, clearNotification }: ClaimTokenButtonProps) => {
   const [claiming, setClaiming] = useState(false);
   const { claimToken } = useCashu();
   const dispatch = useAppDispatch();
   const { addToast } = useToast();
   const { activeWallet } = useCashuContext();
   const { mintlessClaimToken } = useMintlessMode();
   const user = useSelector((state: RootState) => state.user);
   const handleClaim = async () => {
      const privkey = window.localStorage.getItem('privkey');
      if (!privkey) {
         throw new Error('No private key found');
      }
      setClaiming(true);
      try {
         if (user.receiveMode === 'mintless') {
            console.log('claiming mintless token');
            if (!user.lud16) throw new Error('No lud16 found');

            const lockedTo = proofsLockedTo(token.token[0].proofs);

            let privkey: string | undefined;
            if (lockedTo) {
               privkey = user.privkey;
            }

            const wallet = await initializeWallet(token.token[0].mint, { unit: token.unit });

            try {
               const { amountMeltedSat } = await mintlessClaimToken(wallet, token, {
                  privkey,
               });
               if (!amountMeltedSat) throw new Error('Failed to claim token');
               addToast(`Claimed ${formatSats(amountMeltedSat)} to Lightning Wallet`, 'success');
               clearNotification();
            } catch (error: any) {
               console.error('Error claiming token:', error);
               const msg = error.message || 'Failed to claim token';
               addToast(msg, 'error');
            } finally {
               setClaiming(false);
               return;
            }
         }
         if (await claimToken(token, privkey)) {
            clearNotification();
            // TODO: move all tx history logic to useCashu or something like that rather than in all the componenents
            dispatch(
               addTransaction({
                  type: 'ecash',
                  transaction: {
                     token: getEncodedTokenV4(token),
                     amount: token.token[0].proofs.reduce((acc, p) => acc + p.amount, 0),
                     unit: 'usd',
                     mint: token.token[0].mint,
                     status: TxStatus.PAID,
                     date: new Date().toLocaleString(),
                  } as EcashTransaction,
               }),
            );
         } else {
            const isSpent = await isTokenSpent(token);
            if (isSpent) {
               addToast('Already claimed', 'error');
               clearNotification();
            }
         }
      } catch (e) {
         console.error('ERROR CLAIMING TOKEN', e);
      } finally {
         setClaiming(false);
      }
   };

   if (token.token[0].mint !== activeWallet?.mint.mintUrl && user.receiveMode !== 'mintless') {
      return null;
   }

   return (
      <div className='w-4 h-4 flex items-center justify-center'>
         {claiming ? (
            <Spinner size='sm' color='primary' />
         ) : (
            <button className='btn-notification w-full h-full' onClick={handleClaim}>
               claim
            </button>
         )}
      </div>
   );
};

export default ClaimTokenButton;
