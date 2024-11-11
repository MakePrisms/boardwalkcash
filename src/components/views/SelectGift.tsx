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
      <div className='flex flex-col h-full relative text-black'>
         <div className='flex-grow overflow-y-scroll no-scrollbar pb-24 sm:pb-0'>
            <Stickers onSelectGift={setSelectedGift} contact={contact || null} />
         </div>
         <div className='fixed bottom-0 left-0 right-0 flex justify-center bg-white py-8 shadow-lg'>
            <Button onClick={handleContinue} disabled={!selectedGift} className='btn-primary w-fit'>
               Continue
            </Button>
         </div>
      </div>
   );
};
export default SelectGift;
