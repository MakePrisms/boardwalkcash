import { useCashu } from '@/hooks/cashu/useCashu';
import { EcashTransaction, TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useAppDispatch } from '@/redux/store';
import { Token, getEncodedToken } from '@cashu/cashu-ts';
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
                     token: getEncodedToken(token),
                     amount: token.token[0].proofs.reduce((acc, p) => acc + p.amount, 0),
                     unit: 'usd',
                     mint: token.token[0].mint,
                     status: TxStatus.PAID,
                     date: new Date().toLocaleString(),
                  } as EcashTransaction,
               }),
            );
         }
      } catch (e) {
      } finally {
         setClaiming(false);
      }
   };

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
