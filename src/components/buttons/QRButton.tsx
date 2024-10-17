import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { QrCodeIcon } from '@heroicons/react/20/solid';
import { Modal } from 'flowbite-react';
import QRCode from 'qrcode.react';
import { useEffect, useState } from 'react';
import ClipboardButton from './utility/ClipboardButton';

const QRButton = () => {
   const [paymentRequest, setPaymentRequest] = useState('');
   const [showModal, setShowModal] = useState(false);
   const { fetchPaymentRequest } = usePaymentRequests();
   useEffect(() => {
      const storedPaymentRequest = localStorage.getItem('paymentRequest');
      if (storedPaymentRequest) {
         console.log('payment request found', storedPaymentRequest);
         setPaymentRequest(storedPaymentRequest);
      } else {
         fetchPaymentRequest(undefined, true).then(({ pr }) => {
            setPaymentRequest(pr);
            localStorage.setItem('paymentRequest', pr);
         });
      }
   }, []);

   return (
      <div className='fixed left-12 top-0 m-4 p-2 z-10'>
         <button onClick={() => setShowModal(true)}>
            <QrCodeIcon className='h-6 w-6' />
         </button>
         <Modal show={showModal} onClose={() => setShowModal(false)}>
            <Modal.Header>Payment Request</Modal.Header>
            <Modal.Body className={`text-black flex flex-col justify-center items-center gap-6`}>
               <p className='w-2/3 text-center'>
                  Scan with any cashu wallet that supports payment requests
               </p>
               <QRCode value={paymentRequest} size={256} />
               <ClipboardButton
                  toCopy={paymentRequest}
                  toShow={'Copy Request'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
               />
            </Modal.Body>
         </Modal>
      </div>
   );
};

export default QRButton;
