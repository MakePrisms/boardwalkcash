import { Modal, Spinner } from 'flowbite-react';
import React, { useEffect, useMemo, useState } from 'react';
import AnimatedQRCode from '../utility/AnimatedQR';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import QRCode from 'qrcode.react';
import CustomCarousel from '../Carousel/CustomCarousel';
import ErrorBoundary from '../utility/ErrorBoundary';

interface SendEcashModalBodyProps {
   token?: string;
   txid?: string;
   onClose: () => void;
}

const SendEcashModalBody = ({ onClose, token, txid }: SendEcashModalBodyProps) => {
   const [carouselSlides, setCarouselSlides] = useState<React.ReactNode[]>([]);
   const [qrError, setQrError] = useState(false);

   useEffect(() => {
      if (!token) return;

      try {
         const qrCodeValue = `${window.location.protocol}//${window.location.host}/wallet?token=${token}`;

         setCarouselSlides([
            <div className='text-black text-center space-y-2 ml-3' key='1'>
               <ErrorBoundary
                  fallback={
                     <p className='text-red-500'>
                        Failed to load QR. Link too long. Go to transaction history to reclaim your
                        tokens and try again, or just copy the link by clicking the button below.{' '}
                     </p>
                  }
               >
                  <h2 className='text-xl'>Shareable Boardwalk Cash Link</h2>
                  <QRCode value={qrCodeValue} size={window.innerWidth < 768 ? 275 : 400} />
                  <p> Link: {`boardwalkcash.com...`}</p>
               </ErrorBoundary>
            </div>,
            <div className='text-black text-center space-y-2' key='2'>
               <h2 className='text-xl'>Ecash Token</h2>
               <ErrorBoundary
                  fallback={<p className='text-red-500'>Failed to load QR. Token too long</p>}
               >
                  <AnimatedQRCode encodedToken={`${token}`} />
               </ErrorBoundary>
               <p> Token: {`${token.slice(0, 12)}...${token.slice(-5)}`}</p>
            </div>,
         ]);
      } catch (error) {
         console.error(error);
         setQrError(true);
      }

      return () => {};
   }, [token]);

   const toCopy = useMemo(() => {
      const base = `${window.location.protocol}//${window.location.host}/wallet?`;
      if (txid) {
         return `${base}txid=${txid}`;
      } else {
         return `${base}token=${token}`;
      }
   }, [token, txid]);

   if (!token) {
      return (
         <Modal.Body>
            <div className='flex flex-col items-center justify-center space-y-3'>
               <Spinner size='lg' />
               <p className='text-black'>Creating sendable token...</p>
            </div>
         </Modal.Body>
      );
   }

   return (
      <>
         <Modal.Body>
            <div className='flex flex-col justify-center items-center text-black space-y-3'>
               <>
                  <div className='max-w-full'>
                     <CustomCarousel slides={carouselSlides} />
                  </div>
                  <div className='flex space-x-3'>
                     <ClipboardButton
                        toCopy={toCopy}
                        toShow={`Link`}
                        onClick={onClose}
                        className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
                     />
                     <ClipboardButton
                        toCopy={`${token}`}
                        toShow={`Token`}
                        onClick={onClose}
                        className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
                     />
                  </div>
               </>
            </div>
         </Modal.Body>
      </>
   );
};

export default SendEcashModalBody;
