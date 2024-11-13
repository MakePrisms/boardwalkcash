import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import ActiveAndInactiveAmounts from '../utility/amounts/ActiveAndInactiveAmounts';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { getAmountAndExpiryFromInvoice } from '@/utils/bolt11';
import { useState, useCallback, useEffect } from 'react';
import { usePolling } from '@/hooks/util/usePolling';
import useWallet from '@/hooks/boardwalk/useWallet';
import { MintQuoteState } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/util/useToast';
import QRCode from 'qrcode.react';
import { getMsgFromUnknownError } from '@/utils/error';

interface WaitForLightningInvoicePaymentProps {
   onSuccess: () => void;
   checkingId: string;
   invoice: string;
}

export const WaitForLightningInvoicePayment = ({
   invoice,
   checkingId,
   onSuccess,
}: WaitForLightningInvoicePaymentProps) => {
   const { satsToUnit } = useExchangeRate();
   const { activeUnit } = useCashuContext();
   const { tryToMintProofs } = useWallet();
   const { addToast } = useToast();
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);

   useEffect(() => {
      const { amount: amountSats } = getAmountAndExpiryFromInvoice(invoice);
      satsToUnit(amountSats, 'usd').then(amountUsdCents => {
         setAmountData({ amountUsdCents, amountSats });
      });
   }, [invoice, satsToUnit]);

   const checkPaymentStatus = async () => {
      try {
         const status = await tryToMintProofs(checkingId);
         if (status === MintQuoteState.ISSUED) {
            onSuccess();
            setAmountData(null);
         } else {
            console.log('quote not paid', status);
         }
      } catch (error) {
         console.error('Error fetching payment status', error);
         addToast(getMsgFromUnknownError(error), 'error');
      }
   };

   const { isPolling } = usePolling(checkPaymentStatus, 5_000, 60_000);

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
         <div>
            {!isPolling && (
               <div className='flex flex-col items-center justify-center text-center space-y-1 text-black'>
                  <p className='text-xs'>Timed out waiting for payment...</p>
                  <button onClick={checkPaymentStatus} className='underline'>
                     Check again
                  </button>
               </div>
            )}
         </div>
      </div>
   );
};
