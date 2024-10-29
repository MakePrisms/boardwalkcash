import ActiveAndInactiveAmounts from '@/components/utility/amounts/ActiveAndInactiveAmounts';
import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { Currency, GetPaymentRequestResponse } from '@/types';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import QRCode from 'qrcode.react';

type WaitForEcashPaymentProps = {
   request: GetPaymentRequestResponse;
   onSuccess: (token: string) => void;
};

const WaitForEcashPayment = ({ request, onSuccess }: WaitForEcashPaymentProps) => {
   const [unit, setUnit] = useState<Currency | undefined>(undefined);
   const { checkPaymentRequest } = usePaymentRequests();
   const { satsToUnit, unitToSats } = useExchangeRate();
   const [timeout, setPrTimeout] = useState(false);
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);

   const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
   const pollCountRef = useRef(0);
   const MAX_POLL_COUNT = 12; // Will poll for 1 minute (12 * 5 seconds)

   useEffect(() => {
      const { amount, unit } = decodePaymentRequest(request.pr);

      setUnit(unit as Currency | Currency.SAT);

      if (!amount) {
         return setAmountData(null);
      }

      if (unit === 'sat') {
         satsToUnit(amount, 'usd').then(amountUsdCents => {
            setAmountData({ amountUsdCents, amountSats: amount });
         });
      } else if (unit === 'usd') {
         unitToSats(amount / 100, 'usd').then(amountSats => {
            setAmountData({ amountUsdCents: amount, amountSats });
         });
      }
   }, [request.pr, satsToUnit, unitToSats]);

   const pollPayment = useCallback(async () => {
      console.log('checking for payment', request.id);
      const { paid, token } = await checkPaymentRequest(request.id);
      if (paid) {
         onSuccess(token);
         handleClose();
         console.log('Payment completed', token);
         if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      } else {
         pollCountRef.current++;
         if (pollCountRef.current >= MAX_POLL_COUNT) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPrTimeout(true);
         }
      }
   }, [checkPaymentRequest, request.id, onSuccess]);

   const startPolling = useCallback(() => {
      setPrTimeout(false);
      pollCountRef.current = 0;
      pollPayment();

      // Clear any existing interval
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(pollPayment, 5000); // Poll every 5 seconds
   }, [pollPayment]);

   useEffect(() => {
      startPolling();

      return () => {
         if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
   }, [startPolling]);

   const handleClose = () => {
      setPrTimeout(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setUnit(undefined);
   };

   return (
      <div className='flex flex-col items-center justify-around space-y-4 text-gray-500 h-full'>
         <div className='flex flex-col items-center justify-center space-y-4 text-gray-500'>
            {amountData && unit && (
               <ActiveAndInactiveAmounts
                  satAmount={amountData.amountSats}
                  usdCentsAmount={amountData.amountUsdCents}
                  activeUnit={unit}
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
         {timeout && (
            <div className='flex flex-col items-center justify-center text-center space-y-4 text-black'>
               <p className='text-xs'>Timed out waiting for payment...</p>
               <button onClick={startPolling} className='underline'>
                  Check again
               </button>
            </div>
         )}
      </div>
   );
};

export default WaitForEcashPayment;
