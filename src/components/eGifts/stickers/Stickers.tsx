import React, { useMemo, useState } from 'react';
import { formatUnit } from '@/utils/formatting';
import StickerItem from './StickerItem';
import useGifts from '@/hooks/boardwalk/useGifts';
import { GiftAsset, PublicContact } from '@/types';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

interface StickersProps {
   onSelectGift: (gift: GiftAsset) => void;
   contact: PublicContact | null;
}

const Stickers: React.FC<StickersProps> = ({ onSelectGift, contact }) => {
   const [selectedSticker, setSelectedSticker] = useState<GiftAsset | undefined>(undefined);
   const { giftAssets } = useGifts();
   const { activeUnit } = useCashuContext();

   const handleStickerClick = (gift: GiftAsset) => {
      setSelectedSticker(gift);
      onSelectGift(gift);
   };

   const processedGifts = useMemo(() => {
      return Object.entries(giftAssets)
         .filter(([_, g]) => g.creatorPubkey === null || g.creatorPubkey === contact?.pubkey)
         .sort((a, b) => a[1].amount - b[1].amount)
         .map(([_, giftAsset]) => giftAsset);
   }, [giftAssets, contact]);

   return (
      <div className='grid grid-cols-2 gap-4 w-full'>
         {processedGifts
            .filter(g => g.unit === activeUnit)
            /* sort greatest to least by amount */
            .map(giftAsset => (
               <div key={giftAsset.name} className='flex flex-col justify-center'>
                  <button
                     onClick={() => handleStickerClick(giftAsset)}
                     className='flex  justify-center '
                  >
                     <StickerItem
                        selectedSrc={giftAsset.selectedSrc}
                        unselectedSrc={giftAsset.unselectedSrc}
                        isSelected={selectedSticker?.name === giftAsset.name}
                        alt={formatUnit(giftAsset.amount, giftAsset.unit)}
                     />
                  </button>
               </div>
            ))}
      </div>
   );
};

export default Stickers;
