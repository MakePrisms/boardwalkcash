import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import PaymentConfirmationDetails from './PaymentConfirmationDetails';
import { PaymentRequest } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/util/useToast';
import { Button } from 'flowbite-react';
import { Currency } from '@/types';
import { useState } from 'react';
import { getMsgFromUnknownError } from '@/utils/error';

interface MyProps {
   paymentRequest: PaymentRequest;
   requestAmount: number;
   onClose: () => void;
}

const ConfirmAndPayPaymentRequest = ({ paymentRequest, requestAmount, onClose }: MyProps) => {
   const [isProcessing, setIsProcessing] = useState(false);

   const { payPaymentRequest } = usePaymentRequests();
   const { addToast } = useToast();

   const handleClose = () => {
      setIsProcessing(false);
      onClose();
   };

   const handleSendPaymentRequest = async () => {
      try {
         setIsProcessing(true);
         const res = await payPaymentRequest(paymentRequest, requestAmount);
         if (res === true) {
            addToast('Payment request paid!', 'success');
         } else {
            addToast('Failed to pay payment request', 'error');
         }
      } catch (e) {
         const msg = getMsgFromUnknownError(e, 'Failed to pay payment request');
         addToast(msg, 'error');
      } finally {
         handleClose();
      }
   };

   return (
      <div className='text-black flex flex-col items-center justify-between h-full'>
         <PaymentConfirmationDetails
            amount={requestAmount}
            unit={(paymentRequest?.unit as Currency) || Currency.SAT}
            destination={paymentRequest?.toEncodedRequest()}
         />
         <Button
            className='btn-primary'
            onClick={handleSendPaymentRequest}
            isProcessing={isProcessing}
         >
            Send Payment
         </Button>
      </div>
   );
};

export default ConfirmAndPayPaymentRequest;
