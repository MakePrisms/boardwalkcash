import { useEffect, useState } from 'react';
import type { CarouselApi } from '~/components/ui/carousel';

export type UseCarouselReturn = {
  api: CarouselApi | undefined;
  current: number;
  scrollToIndex: (index: number) => void;
  setApi: (api: CarouselApi | undefined) => void;
};

export function useCarousel(): UseCarouselReturn {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollToIndex = (index: number) => {
    api?.scrollTo(index);
  };

  return { api, current, scrollToIndex, setApi };
}
