import { GiftAsset, PublicContact } from '@/types';
import Stickers from '../eGifts/stickers/Stickers';
import { Button } from 'flowbite-react';
import { useState } from 'react';

interface SelectGiftProps {
   onSelectGift: (gift: GiftAsset) => void;
   contact?: PublicContact;
}

const SelectGift = ({ onSelectGift, contact }: SelectGiftProps) => {
   const [selectedGift, setSelectedGift] = useState<GiftAsset | undefined>(undefined);

   const handleContinue = () => {
      if (selectedGift) {
         onSelectGift(selectedGift);
      }
   };

   return (
      <div className='flex flex-col h-full pb-24 relative text-black'>
         <div
            className='flex-grow overflow-y-auto'
            style={{
               /* disable scrollbar */
               msOverflowStyle: 'none',
               scrollbarWidth: 'none',
            }}
         >
            <Stickers onSelectGift={setSelectedGift} contact={contact || null} />
         </div>
         <Button
            onClick={handleContinue}
            disabled={!selectedGift}
            className='btn-primary w-fit self-center'
         >
            Continue
         </Button>
      </div>
   );
};
export default SelectGift;
