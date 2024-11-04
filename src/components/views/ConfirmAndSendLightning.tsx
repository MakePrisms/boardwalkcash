import { addTransaction, TxStatus } from '@/redux/slices/HistorySlice';
import PaymentConfirmationDetails from './PaymentConfirmationDetails';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { MeltQuoteResponse } from '@cashu/cashu-ts';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import { useAppDispatch } from '@/redux/store';
import { Button } from 'flowbite-react';
import { Currency } from '@/types';

interface ConfrimAndSendLightningProps {
   meltQuote?: MeltQuoteResponse;
   onClose: () => void;
   invoice: string;
   amount: number;
   unit: Currency;
   lud16?: string /* just for display */;
}

const ConfrimAndSendLightning = ({
   invoice,
   lud16,
   unit,
   amount,
   meltQuote,
   onClose,
}: ConfrimAndSendLightningProps) => {
   const { nwcPayInvoice, isMintless } = useMintlessMode();
   const { payInvoice: cashuPayInvoice } = useCashu();
   const { activeWallet } = useCashuContext();
   const dispatch = useAppDispatch();
   const { addToast } = useToast();

   const handleSendPayment = async () => {
      if (isMintless) {
         await nwcPayInvoice(invoice);
         return onClose();
      }

      if (!meltQuote) {
         onClose();
         throw new Error('Missing melt quote');
      }

      if (!activeWallet) throw new Error('No active wallet');

      try {
         const result = await cashuPayInvoice(invoice, meltQuote);
         if (result) {
            dispatch(
               addTransaction({
                  type: 'lightning',
                  transaction: {
                     amount: -meltQuote.amount,
                     unit,
                     mint: activeWallet.mint.mintUrl,
                     status: TxStatus.PAID,
                     date: new Date().toLocaleString(),
                     quote: meltQuote.quote,
                  },
               }),
            );
         }
      } catch (error) {
         console.error(error);
         addToast('An error occurred while paying the invoice.', 'error');
      }

      onClose();
   };

   return (
      <div className='text-black flex flex-col justify-around h-full'>
         <PaymentConfirmationDetails
            amount={amount}
            unit={unit}
            destination={lud16 || invoice}
            fee={meltQuote?.fee_reserve}
         />
         <Button className='btn-primary w-full' onClick={handleSendPayment}>
            Send Payment
         </Button>
      </div>
   );
};

export default ConfrimAndSendLightning;
