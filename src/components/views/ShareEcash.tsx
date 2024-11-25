import CustomCarousel from '../utility/Carousel/CustomCarousel';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import StickerItem from '../eGifts/stickers/StickerItem';
import { useEffect, useMemo, useState } from 'react';
import ErrorBoundary from '../utility/ErrorBoundary';
import AnimatedQRCode from '../utility/QR/AnimatedQR';
import { GiftAsset, PublicContact } from '@/types';
import QRCode from 'qrcode.react';
import UserLink from '../utility/UserLink';

interface ShareEcashProps {
   gift?: GiftAsset;
   token?: string;
   txid?: string;
   contact?: PublicContact;
   onClose: () => void;
}

const ShareEcash = ({ token, txid, gift, onClose, contact }: ShareEcashProps) => {
   const carouselSlides = useMemo(() => {
      if (!token) return [];

      const qrCodeValue = `${window.location.protocol}//${window.location.host}/wallet?token=${token}`;

      return [
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
      ];
   }, [token]);

   const base = `${window.location.protocol}//${window.location.host}/wallet`;
   const toCopy = txid ? `${base}?txid=${txid}` : `${base}?token=${token}`;

   if (gift) {
      return (
         <div className='view-ecash-container'>
            <div className='flex flex-col justify-center items-center text-black gap-6'>
               <StickerItem
                  selectedSrc={gift.selectedSrc}
                  unselectedSrc={gift.unselectedSrc}
                  isSelected={true}
                  alt={'gift'}
                  size='lg'
               />
               <p className='text-md text-center'>
                  eGift for {contact?.username && <UserLink username={contact.username} />}{' '}
               </p>
            </div>
            {txid && (
               <ClipboardButton
                  toCopy={`${window.location.origin}/wallet?txid=${txid}`}
                  toShow={'Share'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
                  onClick={onClose}
               />
            )}
            {!txid && token && (
               <ClipboardButton
                  toCopy={`${window.location.origin}/wallet?token=${token}`}
                  toShow={'Share'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
                  onClick={onClose}
               />
            )}
         </div>
      );
   }

   return (
      <div className='flex flex-col justify-around items-center text-black space-y-3 h-full'>
         <div className='max-w-full flex flex-col justify-center items-center text-black space-y-3'>
            {contact?.username && (
               <p className='text-md text-center'>
                  eTip for <UserLink username={contact.username} />
               </p>
            )}
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
