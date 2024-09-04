/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react';

interface StickerItemProps {
   selectedSrc: string;
   unselectedSrc: string;
   alt: string;
   isSelected: boolean;
   size?: 'md' | 'lg';
   count?: number;
}

export default function StickerItem({
   selectedSrc,
   unselectedSrc,
   alt,
   isSelected,
   size = 'md',
   count,
}: StickerItemProps) {
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      const preloadImages = async () => {
         await Promise.all([
            new Promise(resolve => {
               const img = new Image();
               img.onload = resolve;
               img.src = selectedSrc;
            }),
            new Promise(resolve => {
               const img = new Image();
               img.onload = resolve;
               img.src = unselectedSrc;
            }),
         ]);
         setIsLoading(false);
      };
      preloadImages();
   }, [selectedSrc, unselectedSrc]);

   const sizeClasses = {
      md: 'w-[125px] h-[120]  sm:w-[150px] sm:h-[140]',
      lg: 'w-[160px] h-[143]  sm:w-[170px] sm:h-[150]',
   };

   return (
      <div className={`relative ${sizeClasses[size]}`}>
         <img src={isSelected ? selectedSrc : unselectedSrc} alt={alt} className='object-contain' />
         {count !== undefined && (
            <div className='absolute -top-2 -right-2 bg-boardwalk-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-xs'>
               {count}
            </div>
         )}
      </div>
   );
}
