/* eslint-disable @next/next/no-img-element */
import { Spinner } from 'flowbite-react';
import NextImage from 'next/image';
import { useState, useEffect } from 'react';

interface StickerItemProps {
   selectedSrc: string;
   unselectedSrc: string;
   alt: string;
   isSelected: boolean;
}

export default function StickerItem({
   selectedSrc,
   unselectedSrc,
   alt,
   isSelected,
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

   return (
      <div className='relative w-[125px] h-[125px] sm:w-[150px] sm:h-[150px]'>
         <img
            src={isSelected ? selectedSrc : unselectedSrc}
            alt={alt}
            className='object-contain w-full h-full'
         />
      </div>
   );
}
