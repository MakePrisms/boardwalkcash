import ActiveAndInactiveAmounts from '@/components/utility/amounts/ActiveAndInactiveAmounts';
import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { Currency, GetPaymentRequestResponse } from '@/types';
import { useState, useCallback, useEffect } from 'react';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import { usePolling } from '@/hooks/util/usePolling';
import { useCashu } from '@/hooks/cashu/useCashu';
import QRCode from 'qrcode.react';

type WaitForEcashPaymentProps = {
   request: GetPaymentRequestResponse;
   onSuccess: () => void;
};

const WaitForEcashPayment = ({ request, onSuccess }: WaitForEcashPaymentProps) => {
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);

   const { checkPaymentRequest } = usePaymentRequests();
   const { satsToUnit, unitToSats } = useExchangeRate();
   const { handleClaimToSourceMint } = useCashu();

   const { amount, unit } = decodePaymentRequest(request.pr);

   if (amount) {
      if (unit === 'sat') {
         satsToUnit(amount, 'usd').then(amountUsdCents => {
            setAmountData({ amountUsdCents, amountSats: amount });
         });
      } else if (unit === 'usd') {
         unitToSats(amount / 100, 'usd').then(amountSats => {
            setAmountData({ amountUsdCents: amount, amountSats });
         });
      }
   } else {
      setAmountData(null);
   }

   const checkPayment = useCallback(async () => {
      const { token } = await checkPaymentRequest(request.id);
      if (token) {
         await handleClaimToSourceMint(token);
         onSuccess();
         return true;
      }
      return false;
   }, [checkPaymentRequest, request.id, onSuccess, handleClaimToSourceMint]);

   const { start, stop, isPolling } = usePolling(checkPayment, 5_000, 60_000);

   const checkAgain = async () => {
      await checkPayment();
   };

   /* Start polling when component mounts */
   useEffect(() => {
      start();
      return () => stop();
   }, [start, stop]);

   return (
      <div className='flex flex-col items-center justify-around space-y-4 text-gray-500 h-full'>
         <div className='flex flex-col items-center justify-center space-y-4 text-gray-500'>
            {amountData && unit && (
               <ActiveAndInactiveAmounts
                  satAmount={amountData.amountSats}
                  usdCentsAmount={amountData.amountUsdCents}
                  activeUnit={(unit as Currency) || Currency.SAT}
               />
            )}
            <QRCode value={request.pr} size={256} />
            <p className='text-center text-sm'>
               Scan with any ecash wallet that supports payment requests
            </p>
         </div>
         <ClipboardButton
            toCopy={request.pr}
            toShow='Copy Request'
            className='btn-primary hover:!bg-[var(--btn-primary-bg)] justify-self-end'
         />
         {!isPolling && (
            <div className='flex flex-col items-center justify-center text-center space-y-4 text-black'>
               <p className='text-xs'>Timed out waiting for payment...</p>
               <button onClick={checkAgain} className='underline'>
                  Check again
               </button>
            </div>
         )}
      </div>
   );
};

export default WaitForEcashPayment;
