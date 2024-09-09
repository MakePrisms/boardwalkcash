import { Modal, Spinner } from 'flowbite-react';
import QRCode from 'qrcode.react';
import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { formatCents, formatSats } from '@/utils/formatting';
import { useEffect, useState } from 'react';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';

interface WaitForInvoiceModalProps {
   isOpen: boolean;
   onClose: () => void;
   invoice: string;
   amountUsdCents: number;
   invoiceTimeout: boolean;
   onCheckAgain: () => void;
}

export const WaitForInvoiceModalBody: React.FC<
   Omit<WaitForInvoiceModalProps, 'isOpen' | 'onClose'>
> = ({ invoice, amountUsdCents, invoiceTimeout, onCheckAgain }) => {
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);
   const [loading, setLoading] = useState(true);
   const { unitToSats } = useExchangeRate();

   useEffect(() => {
      setLoading(true);
      unitToSats(amountUsdCents / 100, 'usd')
         .then(amountSats => {
            setAmountData({ amountUsdCents, amountSats });
         })
         .finally(() =>
            setTimeout(() => {
               setLoading(false);
            }, 300),
         );
   }, [amountUsdCents, unitToSats]);

   if (loading) {
      return (
         <div className='flex flex-col items-center justify-center space-y-4'>
            <Spinner size='lg' />
            <p className='text-black'>Loading...</p>
         </div>
      );
   }

   return (
      <div className='flex flex-col items-center justify-center space-y-4'>
         <p className='text-black'>Scan with any Lightning wallet</p>
         {amountData && (
            <div className='bg-white bg-opacity-90 p-2 rounded shadow-md'>
               <div className='flex items-center justify-center space-x-5 text-black'>
                  <div>{formatCents(amountData.amountUsdCents)}</div>
                  <div>|</div>
                  <div>{formatSats(amountData.amountSats)}</div>
               </div>
            </div>
         )}
         <QRCode value={invoice} size={256} />
         <ClipboardButton
            toCopy={invoice}
            toShow='Copy Invoice'
            className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
         />
         {invoiceTimeout && (
            <div className='flex flex-col items-center justify-center text-center space-y-4 text-black'>
               <p>Timed out waiting for payment...</p>
               <button className='underline' onClick={onCheckAgain}>
                  Check again
               </button>
            </div>
         )}
      </div>
   );
};

const WaitForInvoiceModal: React.FC<WaitForInvoiceModalProps> = ({
   isOpen,
   onClose,
   ...bodyProps
}) => {
   return (
      <Modal show={isOpen} onClose={onClose}>
         <Modal.Header>Lightning Invoice</Modal.Header>
         <Modal.Body>
            <WaitForInvoiceModalBody {...bodyProps} />
         </Modal.Body>
      </Modal>
   );
};

export default WaitForInvoiceModal;
