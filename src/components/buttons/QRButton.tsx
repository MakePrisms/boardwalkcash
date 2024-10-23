import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import { QrCodeIcon } from '@heroicons/react/20/solid';
import { Modal } from 'flowbite-react';
import QRCode from 'qrcode.react';
import { useEffect, useState } from 'react';
import ClipboardButton from './utility/ClipboardButton';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import QRScannerButton from './QRScannerButton';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';

const QRButton = ({ onScan }: { onScan: (result: string) => void }) => {
   const [paymentRequest, setPaymentRequest] = useState('');
   const [showModal, setShowModal] = useState(false);
   const [showModalContent, setShowModalContent] = useState(true);
   const { fetchPaymentRequest } = usePaymentRequests();
   const { activeWallet, activeUnit } = useCashuContext();
   const { isMintless } = useMintlessMode();

   useEffect(() => {
      if (!activeWallet) return;
      if (!activeUnit) return;
      const storedPaymentRequest = localStorage.getItem('paymentRequest');
      if (storedPaymentRequest) {
         console.log('payment request found', storedPaymentRequest);
         const { mints, unit } = decodePaymentRequest(storedPaymentRequest);
         if (
            mints &&
            mints.length > 0 &&
            (!mints?.some(url => url === activeWallet?.mint.mintUrl) || unit !== activeUnit)
         ) {
            fetchPaymentRequest(undefined, true).then(({ pr }) => {
               setPaymentRequest(pr);
               localStorage.setItem('paymentRequest', pr);
            });
         } else {
            setPaymentRequest(storedPaymentRequest);
         }
      } else {
         fetchPaymentRequest(undefined, true).then(({ pr }) => {
            setPaymentRequest(pr);
            localStorage.setItem('paymentRequest', pr);
         });
      }
   }, [activeWallet, activeUnit]);

   const handleScan = (result: string) => {
      setShowModal(false);
      onScan(result);
   };

   const handleClose = () => {
      setShowModal(false);
      setShowModalContent(true);
   };

   return (
      <div>
         <button onClick={() => setShowModal(true)}>
            <QrCodeIcon className='size-8 text-gray-500' />
         </button>
         <Modal show={showModal} onClose={handleClose}>
            <Modal.Header>Payment Request</Modal.Header>
            {showModalContent && (
               <Modal.Body className={`text-black flex flex-col justify-center items-center gap-6`}>
                  {isMintless ? (
                     <p className='w-2/3 text-center'>
                        You currently have a Lightning Wallet set as your main account. Select an
                        eCash mint as your main account to generate an eCash request.
                     </p>
                  ) : (
                     <>
                        <p className='w-2/3 text-center'>
                           Scan with any cashu wallet that supports payment requests
                        </p>
                        <QRCode value={paymentRequest} size={256} />
                        <ClipboardButton
                           toCopy={paymentRequest}
                           toShow={'Copy Request'}
                           className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
                        />
                     </>
                  )}
               </Modal.Body>
            )}
            <Modal.Footer className='flex justify-end'>
               <QRScannerButton
                  onScan={handleScan}
                  btnText='Scan'
                  onClick={() => setShowModalContent(false)}
                  onClose={handleClose}
               />
            </Modal.Footer>
         </Modal>
      </div>
   );
};

export default QRButton;
