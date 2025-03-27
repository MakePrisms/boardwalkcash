import React, { type ReactNode, useEffect, useState } from 'react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '~/components/ui/carousel';

type ControlsProps = {
  current: number;
  onSelect: (index: number) => void;
  options: Array<{
    icon: ReactNode;
    label?: string;
    id: string;
  }>;
  className?: string;
};

function Controls({
  current,
  onSelect,
  options,
  className = 'mt-8 flex flex-col items-center gap-4',
}: ControlsProps) {
  return (
    <div className={className}>
      <div className="flex rounded-full border">
        {options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className={`rounded-full px-6 py-3 ${
              current === index ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => onSelect(index)}
            title={option.label}
          >
            {option.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useCarousel() {
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

type CarouselWithNavigationControlsProps = {
  /**
   * The children to display in the carousel.
   * Each child must have a key prop.
   */
  children: React.ReactElement[];
  /**
   * Metadata for the controls that allow navigation between the carousel items.
   */
  controls: {
    icon: ReactNode;
    label?: string;
    id: string;
  }[];
  /**
   * Optionally set the carousel API returned by the useCarousel hook.
   * If not provided, the carousel API will be set internally.
   * This is useful if you want to use the carousel API in a parent component.
   */
  setApi?: (api: CarouselApi) => void;
};

export function CarouselWithNavigationControls({
  children,
  controls,
  setApi,
}: CarouselWithNavigationControlsProps) {
  const { current, scrollToIndex, setApi: setInternalApi } = useCarousel();

  if (children.length !== controls.length) {
    throw new Error('Children and controls must have the same length');
  }

  const handleApiSet = (api: CarouselApi) => {
    setInternalApi(api);
    if (setApi) {
      setApi(api);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-8 py-8">
      <Carousel setApi={handleApiSet} opts={{ align: 'center', loop: true }}>
        <CarouselContent>
          {children.map((child, index) => (
            <CarouselItem key={controls[index].id}>
              {React.cloneElement(child)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <Controls
        current={current}
        onSelect={(index) => {
          scrollToIndex(index);
        }}
        options={controls}
      />
    </div>
  );
}
