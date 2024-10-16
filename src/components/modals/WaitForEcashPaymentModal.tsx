import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { Currency } from '@/types';
import { formatCents, formatSats } from '@/utils/formatting';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import { Modal } from 'flowbite-react';
import QRCode from 'qrcode.react';
import { useState, useEffect, useCallback } from 'react';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { useToast } from '@/hooks/util/useToast';

type WaitForEcashPaymentModalProps = {
   pr: string;
   id: string;
   isOpen: boolean;
   onClose: () => void;
   onSuccess: (token: string) => void;
};

const WaitForEcashPaymentModal = ({
   pr,
   id,
   isOpen,
   onClose,
   onSuccess,
}: WaitForEcashPaymentModalProps) => {
   const { checkPaymentRequest } = usePaymentRequests();
   const { satsToUnit, unitToSats } = useExchangeRate();
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);
   const [unit, setUnit] = useState<Currency | undefined>(undefined);
   const [isPaid, setIsPaid] = useState(false);
   const [timeout, setPrTimeout] = useState(false);
   const { addToast } = useToast();

   useEffect(() => {
      const { amount, unit } = decodePaymentRequest(pr);

      setUnit(unit as Currency | undefined);

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
   }, [pr, satsToUnit, unitToSats]);

   useEffect(() => {
      let timeoutId: NodeJS.Timeout;

      const pollPayment = async () => {
         const { paid, token } = await checkPaymentRequest(id);
         if (paid) {
            onSuccess(token);
            console.log('Payment completed', token);
         } else if (!timeout) {
            setTimeout(pollPayment, 5000); // Poll every 5 seconds if not timed out
         }
      };

      // const startPolling = () => {
      //    setPrTimeout(false);
      //    pollPayment();
      //    timeoutId = setTimeout(() => {
      //       setPrTimeout(true);
      //    }, 6000); // Timeout after 60 seconds
      // };

      // startPolling();

      pollPayment();

      return () => {
         clearTimeout(timeoutId);
      };
   }, []);

   // const onCheckAgain = () => {
   //    setPrTimeout(false);
   //    // pollPayment();
   // };

   return (
      <Modal className='text-black' show={isOpen} onClose={onClose}>
         <Modal.Header>Receive Ecash</Modal.Header>
         <Modal.Body className='flex flex-col items-center justify-center space-y-4'>
            <p className='text-black w-2/3 text-center'>
               Scan with any ecash wallet that supports payment requests
            </p>
            {amountData && (
               <div className='bg-white bg-opacity-90 p-2 rounded shadow-md'>
                  <div className='flex items-center justify-center space-x-5 text-black'>
                     {amountData ? (
                        <>
                           <div>{`~${formatCents(amountData.amountUsdCents)}`}</div>
                           <div>|</div>
                           <div>{formatSats(amountData.amountSats)}</div>
                        </>
                     ) : (
                        <div>Any amount</div>
                     )}
                  </div>
               </div>
            )}
            {isPaid ? (
               <div>Payment completed!</div>
            ) : (
               <>
                  <QRCode value={pr} size={256} />
                  <ClipboardButton
                     toCopy={pr}
                     toShow='Copy Request'
                     className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
                  />
                  {timeout && (
                     <div className='flex flex-col items-center justify-center text-center space-y-4 text-black'>
                        <p>Timed out waiting for payment...</p>
                        <button className='underline'>Check again</button>
                     </div>
                  )}
               </>
            )}
         </Modal.Body>
      </Modal>
   );
};

export default WaitForEcashPaymentModal;
