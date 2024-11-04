import CustomCarousel from '../utility/Carousel/CustomCarousel';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import StickerItem from '../eGifts/stickers/StickerItem';
import { useEffect, useMemo, useState } from 'react';
import ErrorBoundary from '../utility/ErrorBoundary';
import AnimatedQRCode from '../utility/QR/AnimatedQR';
import { GiftAsset, PublicContact } from '@/types';
import QRCode from 'qrcode.react';

interface ShareEcashProps {
   gift?: GiftAsset;
   token?: string;
   txid?: string;
   contact?: PublicContact;
   onClose: () => void;
}

const ShareEcash = ({ token, txid, gift, onClose, contact }: ShareEcashProps) => {
   const [carouselSlides, setCarouselSlides] = useState<React.ReactNode[]>([]);

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
                  <QRCode value={qrCodeValue} size={275} />
                  <p> Link: {`boardwalkcash.com...`}</p>
               </ErrorBoundary>
            </div>,
            <div className='text-black text-center space-y-2' key='2'>
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
      }
   }, [token]);

   const toCopy = useMemo(() => {
      const base = `${window.location.protocol}//${window.location.host}/wallet?`;
      if (txid) {
         return `${base}txid=${txid}`;
      } else {
         return `${base}token=${token}`;
      }
   }, [token, txid]);

   if (gift) {
      return (
         <div className='flex flex-col justify-around items-center text-black  h-full'>
            <div className='flex flex-col justify-center items-center text-black text-2xl gap-6'>
               {contact && <p>eGift for {contact.username}</p>}
               <StickerItem
                  selectedSrc={gift.selectedSrc}
                  unselectedSrc={gift.unselectedSrc}
                  isSelected={true}
                  alt={'gift'}
                  size='lg'
               />
            </div>
            {txid && (
               <ClipboardButton
                  toCopy={`${window.location.origin}/wallet?txid=${txid}`}
                  toShow={'Share'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)] mt-6 w-full'
                  onClick={onClose}
               />
            )}
            {!txid && token && (
               <ClipboardButton
                  toCopy={`${window.location.origin}/wallet?token=${token}`}
                  toShow={'Share'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)] mt-6 w-full'
                  onClick={onClose}
               />
            )}
         </div>
      );
   }

   return (
      <div className='flex flex-col justify-around items-center text-black space-y-3 h-full'>
         <div className='max-w-full flex flex-col justify-center items-center text-black space-y-3'>
            {contact && <p className='text-2xl'>eTip for {contact.username}</p>}
            <CustomCarousel slides={carouselSlides} />
         </div>
         <div className='flex space-x-3 w-full'>
            <ClipboardButton
               toCopy={toCopy}
               toShow={`Link`}
               className='btn-primary hover:!bg-[var(--btn-primary-bg)] w-1/2'
               onClick={onClose}
            />
            <ClipboardButton
               toCopy={`${token}`}
               toShow={`Token`}
               className='btn-primary hover:!bg-[var(--btn-primary-bg)] w-1/2'
               onClick={onClose}
            />
         </div>
      </div>
   );
};

export default ShareEcash;
