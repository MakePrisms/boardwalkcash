import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import PaymentConfirmationDetails from './PaymentConfirmationDetails';
import { PaymentRequest } from '@cashu/cashu-ts';
import { useToast } from '@/hooks/util/useToast';
import { Button } from 'flowbite-react';
import { Currency } from '@/types';
import { useState } from 'react';

interface MyProps {
   paymentRequest: PaymentRequest;
   requestAmount: number;
   onReset: () => void;
}

const ConfirmAndPayPaymentRequest = ({ paymentRequest, requestAmount, onReset }: MyProps) => {
   const [isProcessing, setIsProcessing] = useState(false);

   const { payPaymentRequest } = usePaymentRequests();
   const { addToast } = useToast();

   const resetState = () => {
      setIsProcessing(false);
      onReset();
   };

   const handleSendPaymentRequest = async () => {
      setIsProcessing(true);
      const res = await payPaymentRequest(paymentRequest, requestAmount).catch(e => {
         const message = e.message || 'Failed to pay payment request';
         addToast(message, 'error');
         resetState();
      });
      if (res) {
         addToast('Payment request paid!', 'success');
      }
      resetState();
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
