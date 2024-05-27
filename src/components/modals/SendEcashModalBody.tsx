import { Modal } from 'flowbite-react';
import React, { useEffect, useState } from 'react';
import AnimatedQRCode from '../AnimatedQR';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import QRCode from 'qrcode.react';
import CustomCarousel from '../Carousel/CustomCarousel';

interface SendEcashModalBodyProps {
   token: string;
   onClose: () => void;
}

const SendEcashModalBody = ({ onClose, token }: SendEcashModalBodyProps) => {
   const [carouselSlides, setCarouselSlides] = useState<React.ReactNode[]>([]);

   useEffect(() => {
      if (!token) return;
      setCarouselSlides([
         <div className='text-black text-center space-y-2 ml-2' key='1'>
            <h2 className='text-xl'>Shareable Boardwalk Cash Link</h2>
            <QRCode
               value={`${window.location.protocol}//${window.location.host}/wallet?token=${token}`}
               size={window.innerWidth < 768 ? 275 : 400}
            />
            <p> Link: {`boardwalkcash.com...`}</p>
         </div>,
         <div className='text-black text-center space-y-2' key='2'>
            <h2 className='text-xl'>Ecash Token</h2>
            <AnimatedQRCode encodedToken={`${token}`} />
            <p> Token: {`${token.slice(0, 12)}...${token.slice(-5)}`}</p>
         </div>,
      ]);
      return () => {};
   }, [token]);

   return (
      <>
         <Modal.Body>
            <div className='flex flex-col justify-center items-center text-black space-y-3'>
               {token && (
                  <>
                     <div className='max-w-full'>
                        <CustomCarousel slides={carouselSlides} />
                     </div>
                     <div className='flex space-x-3'>
                        <ClipboardButton
                           toCopy={`${window.location.protocol}//${window.location.host}/wallet?token=${token}`}
                           toShow={`Link`}
                           onClick={onClose}
                        />
                        <ClipboardButton toCopy={`${token}`} toShow={`Token`} onClick={onClose} />
                     </div>
                  </>
               )}
            </div>
         </Modal.Body>
      </>
   );
};

export default SendEcashModalBody;
