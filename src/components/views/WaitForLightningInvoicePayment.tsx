import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import ActiveAndInactiveAmounts from '../utility/amounts/ActiveAndInactiveAmounts';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { getAmountAndExpiryFromInvoice } from '@/utils/bolt11';
import { getInvoiceStatus } from '@/utils/appApiRequests';
import { Spinner } from 'flowbite-react';
import QRCode from 'qrcode.react';

interface WaitForLightningInvoicePaymentProps {
   onSuccess: (amount: number) => void;
   checkingId: string;
   invoice: string;
}

export const WaitForLightningInvoicePayment = ({
   invoice,
   checkingId,
   onSuccess,
}: WaitForLightningInvoicePaymentProps) => {
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [loading, setLoading] = useState(true);
   const { satsToUnit } = useExchangeRate();
   const { activeUnit } = useCashuContext();
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);

   const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
   const pollCountRef = useRef(0);
   const MAX_POLL_COUNT = 4;

   const checkPaymentStatus = useCallback(async () => {
      try {
         const pubkey = window.localStorage.getItem('pubkey');
         if (!pubkey) throw new Error('No pubkey found');

         const statusResponse = await getInvoiceStatus(pubkey, checkingId);
         return statusResponse.paid;
      } catch (error) {
         console.error('Error fetching payment status', error);
         return false;
      }
   }, [checkingId]);

   const pollPayment = useCallback(async () => {
      console.log('checking for payment', checkingId);
      const paid = await checkPaymentStatus();

      if (paid && amountData) {
         onSuccess(amountData.amountUsdCents);
         if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      } else {
         pollCountRef.current++;
         if (pollCountRef.current >= MAX_POLL_COUNT) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setInvoiceTimeout(true);
         }
      }
   }, [checkingId, checkPaymentStatus, amountData, onSuccess]);

   const startPolling = useCallback(() => {
      setInvoiceTimeout(false);
      pollCountRef.current = 0;
      pollPayment();

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(pollPayment, 5000);
   }, [pollPayment]);

   useEffect(() => {
      // startPolling();
      return () => {
         if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
   }, [startPolling]);

   useEffect(() => {
      setLoading(true);
      const { amount: amountSats } = getAmountAndExpiryFromInvoice(invoice);
      satsToUnit(amountSats, 'usd')
         .then(amountUsdCents => {
            setAmountData({ amountUsdCents, amountSats });
         })
         .finally(() =>
            setTimeout(() => {
               setLoading(false);
            }, 300),
         );
   }, [invoice, satsToUnit]);

   const handleCheckAgain = () => {
      startPolling();
   };

   if (loading) {
      return (
         <div className='flex flex-col items-center justify-center space-y-4'>
            <Spinner size='lg' />
            <p className='text-black'>Loading...</p>
         </div>
      );
   }

   return (
      <div className='flex flex-col items-center justify-around space-y-4 text-gray-500 h-full'>
         <div className='flex flex-col items-center justify-center space-y-4 text-gray-500'>
            {amountData && (
               <ActiveAndInactiveAmounts
                  satAmount={amountData.amountSats}
                  usdCentsAmount={amountData.amountUsdCents}
                  activeUnit={activeUnit}
               />
            )}
            <QRCode value={invoice} size={256} />
            <p className='text-center text-sm'>Scan with any Lightning wallet</p>
         </div>
         <ClipboardButton
            toCopy={invoice}
            toShow='Copy Invoice'
            className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
         />
         {invoiceTimeout && (
            <div className='flex flex-col items-center justify-center text-center space-y-4 text-black'>
               <p className='text-xs'>Timed out waiting for payment...</p>
               <button onClick={handleCheckAgain} className='underline'>
                  Check again
               </button>
            </div>
         )}
      </div>
   );
};
