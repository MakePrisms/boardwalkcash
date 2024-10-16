import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { Modal } from 'flowbite-react';
import QRCode from 'qrcode.react';
import { useState, useEffect } from 'react';

type WaitForEcashPaymentModalProps = {
   pr: string;
   id: string;
   isOpen: boolean;
   setIsOpen: (value: boolean) => void;
};

const WaitForEcashPaymentModal = ({ pr, id, isOpen, setIsOpen }: WaitForEcashPaymentModalProps) => {
   const { checkPaymentRequest } = usePaymentRequests();
   const [isPaid, setIsPaid] = useState(false);

   useEffect(() => {
      const pollPayment = async () => {
         const { paid, token } = await checkPaymentRequest(id);
         if (paid) {
            setIsPaid(true);
            console.log('Payment completed', token);
         } else {
            setTimeout(pollPayment, 5000); // Poll every 5 seconds
         }
      };

      pollPayment();

      return () => {
         // Clean up any ongoing polling when component unmounts
      };
   }, [checkPaymentRequest, id]);

   return (
      <Modal className='text-black' show={isOpen} onClose={() => setIsOpen(false)}>
         <Modal.Header>Receive Ecash</Modal.Header>
         <Modal.Body>
            {isPaid ? <div>Payment completed!</div> : <QRCode value={pr} size={256} />}
         </Modal.Body>
      </Modal>
   );
};

export default WaitForEcashPaymentModal;
