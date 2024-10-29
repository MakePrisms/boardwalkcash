import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { Currency } from '@/types';
import { formatCents, formatSats } from '@/utils/formatting';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import { Modal } from 'flowbite-react';
import QRCode from 'qrcode.react';
import { useState, useEffect, useCallback, useRef } from 'react';
import ClipboardButton from '../buttons/utility/ClipboardButton';

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

   const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

   const pollPayment = useCallback(async () => {
      console.log('checking for payment', id);
      const { paid, token } = await checkPaymentRequest(id);
      if (paid) {
         onSuccess(token);
         handleClose();
         console.log('Payment completed', token);
         setIsPaid(true);
         if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
         if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
   }, [checkPaymentRequest, id, onSuccess]);

   useEffect(() => {
      const startPolling = () => {
         setPrTimeout(false);
         pollPayment();
         pollIntervalRef.current = setInterval(pollPayment, 5000); // Poll every 5 seconds
         timeoutRef.current = setTimeout(() => {
            setPrTimeout(true);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
         }, 60000); // Timeout after 60 seconds
      };

      if (isOpen) {
         startPolling();
      }

      return () => {
         if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
         if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
   }, [checkPaymentRequest, id, onSuccess]);

   // const onCheckAgain = () => {
   //    setPrTimeout(false);
   //    // pollPayment();
   // };

   const handleClose = () => {
      setPrTimeout(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsPaid(false);
      setUnit(undefined);
      onClose();
   };

   return (
      <Modal className='text-black' show={isOpen} onClose={handleClose}>
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
         </Modal.Body>
      </Modal>
   );
};

export default WaitForEcashPaymentModal;
