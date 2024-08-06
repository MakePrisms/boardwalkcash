import { formatCents } from '@/utils/formatting';
import React, { useState } from 'react';

interface StickersProps {
   onSelectGift: (gift: string) => void;
   emojis: { amount: number; emoji: string }[];
}

const Stickers: React.FC<StickersProps> = ({ emojis, onSelectGift }) => {
   const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

   const handleEmojiClick = (emoji: string) => {
      setSelectedEmoji(emoji);
      onSelectGift(emoji);
   };

   const amounts = [10, 100, 200, 10_000];

   return (
      <div className=''>
         <div className='flex flex-row justify-around items-center text-5xl'>
            {emojis.map(({ emoji, amount }, index) => (
               <div
                  key={index}
                  className={`hover:cursor-pointer ${selectedEmoji === emoji ? 'bg-blue-500' : ''}`}
                  onClick={() => handleEmojiClick(emoji)}
               >
                  <span className='emoji-sticker'>{emoji}</span>
                  <div className='text-center text-sm'>{formatCents(amount)}</div>
               </div>
            ))}
         </div>
      </div>
   );
};

export default Stickers;
