import { useCashu } from '@/hooks/cashu/useCashu';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useToast } from '@/hooks/util/useToast';
import { EcashTransaction, TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useAppDispatch } from '@/redux/store';
import { isTokenSpent } from '@/utils/cashu';
import { Token, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { Spinner } from 'flowbite-react';
import { useState } from 'react';

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
   const handleClaim = async () => {
      const privkey = window.localStorage.getItem('privkey');
      if (!privkey) {
         throw new Error('No private key found');
      }
      setClaiming(true);
      try {
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

   if (token.token[0].mint !== activeWallet?.mint.mintUrl) {
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
