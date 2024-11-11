import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { DotButton } from '@/components/utility/Carousel/CarouselButtons';

interface CustomCarouselProps {
   slides: React.ReactNode[];
}

const CustomCarousel: React.FC<CustomCarouselProps> = ({ slides }) => {
   const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
   const [selectedIndex, setSelectedIndex] = useState<number>(0);
   const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

   const scrollTo = useCallback(
      (index: number) => emblaApi && emblaApi.scrollTo(index),
      [emblaApi],
   );

   const onSelect = useCallback(() => {
      if (!emblaApi) return;
      setSelectedIndex(emblaApi.selectedScrollSnap());
   }, [emblaApi]);

   useEffect(() => {
      if (!emblaApi) return;

      const onInit = () => {
         setScrollSnaps(emblaApi.scrollSnapList());
         onSelect(); // Update selected index on init
      };

      emblaApi.on('init', onInit);
      emblaApi.on('select', onSelect);
      emblaApi.on('reInit', onInit);

      return () => {
         emblaApi.off('init', onInit);
         emblaApi.off('select', onSelect);
         emblaApi.off('reInit', onInit);
      };
   }, [emblaApi, onSelect]);

   useEffect(() => {
      if (!emblaApi) return;
      emblaApi.reInit(); // Ensure Embla is re-initialized when slides change
   }, [slides, emblaApi]);

   return (
      <div className='embla max-w-full'>
         <div className='embla__viewport' ref={emblaRef}>
            <div className='embla__container'>
               {slides.map((slide, index) => (
                  <div className='embla__slide ' key={index}>
                     {slide}
                  </div>
               ))}
            </div>
         </div>
         <div className='embla__dots'>
            {scrollSnaps.map((_, index) => (
               <DotButton
                  key={index}
                  selected={index === selectedIndex}
                  onClick={() => scrollTo(index)}
               />
            ))}
         </div>
      </div>
   );
};

export default CustomCarousel;
