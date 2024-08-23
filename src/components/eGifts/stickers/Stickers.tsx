import React, { useState } from 'react';
import { formatCents } from '@/utils/formatting';
import StickerItem from './StickerItem';
import useGifts from '@/hooks/boardwalk/useGifts';
import { GiftAsset } from '@/types';

interface StickersProps {
   onSelectGift: (gift: GiftAsset) => void;
}

const Stickers: React.FC<StickersProps> = ({ onSelectGift }) => {
   const [selectedSticker, setSelectedSticker] = useState<GiftAsset | undefined>(undefined);
   const { giftAssets, getGiftByIdentifier } = useGifts();

   const handleStickerClick = (giftName: string) => {
      const gift = getGiftByIdentifier(giftName);
      if (!gift) {
         console.error('Gift not found:', giftName);
         return;
      }
      setSelectedSticker(gift);
      onSelectGift(gift);
   };

   return (
      <div className='grid md:grid-cols-3 grid-cols-2 gap-4 w-full'>
         {Object.entries(giftAssets)
            /* sort greatest to least by amount */
            .sort((a, b) => a[1].amountCents - b[1].amountCents)
            .map(([giftKey, giftAsset]) => (
               <div key={giftKey} className='flex justify-center'>
                  <button
                     onClick={() => handleStickerClick(giftKey)}
                     className='flex  justify-center '
                  >
                     <StickerItem
                        selectedSrc={giftAsset.selectedSrc}
                        unselectedSrc={giftAsset.unselectedSrc}
                        isSelected={selectedSticker?.name === giftKey}
                        alt={formatCents(giftAsset.amountCents)}
                     />
                  </button>
               </div>
            ))}
      </div>
   );
};

export default Stickers;
