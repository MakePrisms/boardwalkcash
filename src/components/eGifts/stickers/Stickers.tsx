import React, { useMemo, useState } from 'react';
import { formatCents } from '@/utils/formatting';
import StickerItem from './StickerItem';
import useGifts from '@/hooks/boardwalk/useGifts';
import { GiftAsset, PublicContact } from '@/types';

interface StickersProps {
   onSelectGift: (gift: GiftAsset) => void;
   contact: PublicContact | null;
}

const Stickers: React.FC<StickersProps> = ({ onSelectGift, contact }) => {
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

   const processedGifts = useMemo(() => {
      return Object.entries(giftAssets)
         .filter(([_, g]) => g.creatorPubkey === null || g.creatorPubkey === contact?.pubkey)
         .sort((a, b) => a[1].amountCents - b[1].amountCents)
         .map(([_, giftAsset]) => giftAsset);
   }, [giftAssets, contact]);

   return (
      <div className='grid md:grid-cols-3 grid-cols-2 gap-4 w-full'>
         {processedGifts
            /* sort greatest to least by amount */
            .map(giftAsset => (
               <div key={giftAsset.name} className='flex justify-center'>
                  <button
                     onClick={() => handleStickerClick(giftAsset.name)}
                     className='flex  justify-center '
                  >
                     <StickerItem
                        selectedSrc={giftAsset.selectedSrc}
                        unselectedSrc={giftAsset.unselectedSrc}
                        isSelected={selectedSticker?.name === giftAsset.name}
                        alt={formatCents(giftAsset.amountCents)}
                     />
                  </button>
               </div>
            ))}
      </div>
   );
};

export default Stickers;
