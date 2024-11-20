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

   useEffect(() => {
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
   }, [amount, unit, satsToUnit, unitToSats]);

   const checkPayment = async () => {
      try {
         const { token } = await checkPaymentRequest(request.id);
         if (token) {
            await handleClaimToSourceMint(token);
            onSuccess();
         }
      } catch (e) {
         console.error('Error checking payment', e);
      }
   };

   const { isPolling } = usePolling(checkPayment, 5_000, 60_000);

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
            <p className='text-center text-sm max-w-[263px]'>
               Scan with any cashu wallet that supports payment requests
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
               <button onClick={checkPayment} className='underline'>
                  Check again
               </button>
            </div>
         )}
      </div>
   );
};

export default WaitForEcashPayment;
