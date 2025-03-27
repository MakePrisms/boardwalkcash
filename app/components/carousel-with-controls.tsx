import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '~/components/ui/carousel';
import { cn } from '~/lib/utils';

type Control = {
  icon: ReactNode;
  label?: string;
  id: string;
};

type ControlsProps = {
  current: number;
  onSelect: (index: number) => void;
  controls: Control[];
  className?: string;
};

function Controls({
  current,
  onSelect,
  controls,
  className = 'mt-8 flex flex-col items-center gap-4',
}: ControlsProps) {
  return (
    <div className={className}>
      <div className="flex rounded-full border">
        {controls.map((control, index) => (
          <button
            key={control.id}
            type="button"
            className={`rounded-full px-6 py-3 ${
              current === index ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => onSelect(index)}
            title={control.label}
          >
            {control.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function useCarousel() {
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

type CarouselWithControlsContextValue = {
  api: CarouselApi | undefined;
  current: number;
  scrollToIndex: (index: number) => void;
};

const CarouselWithControlsContext = React.createContext<
  CarouselWithControlsContextValue | undefined
>(undefined);

function useCarouselWithControls() {
  const context = React.useContext(CarouselWithControlsContext);
  if (!context) {
    throw new Error(
      'useCarouselWithControls must be used within a CarouselWithControls',
    );
  }
  return context;
}

type CarouselWithControlsProps = React.ComponentPropsWithoutRef<
  typeof Carousel
> & {
  setApi?: (api: CarouselApi) => void;
};

const CarouselWithControlsRoot = React.forwardRef<
  HTMLDivElement,
  CarouselWithControlsProps
>(({ className, children, setApi, ...props }, ref) => {
  const { current, scrollToIndex, setApi: setInternalApi, api } = useCarousel();

  const handleApiSet = (api: CarouselApi) => {
    setInternalApi(api);
    if (setApi) {
      setApi(api);
    }
  };

  const value = useMemo(
    () => ({
      api,
      current,
      scrollToIndex,
    }),
    [api, current, scrollToIndex],
  );

  return (
    <CarouselWithControlsContext.Provider value={value}>
      <div
        ref={ref}
        className={cn(
          'flex w-full flex-col items-center justify-center px-8 py-8',
          className,
        )}
      >
        <Carousel
          setApi={handleApiSet}
          opts={{ align: 'center', loop: true }}
          {...props}
        >
          {children}
        </Carousel>
      </div>
    </CarouselWithControlsContext.Provider>
  );
});
CarouselWithControlsRoot.displayName = 'CarouselWithControls';

const CarouselWithControlsContent = React.forwardRef<
  React.ElementRef<typeof CarouselContent>,
  React.ComponentPropsWithoutRef<typeof CarouselContent>
>(({ className, children, ...props }, ref) => (
  <CarouselContent ref={ref} className={cn(className)} {...props}>
    {children}
  </CarouselContent>
));
CarouselWithControlsContent.displayName = 'CarouselWithControlsContent';

const CarouselWithControlsItem = React.forwardRef<
  React.ElementRef<typeof CarouselItem>,
  React.ComponentPropsWithoutRef<typeof CarouselItem>
>(({ className, children, ...props }, ref) => (
  <CarouselItem ref={ref} className={cn(className)} {...props}>
    {children}
  </CarouselItem>
));
CarouselWithControlsItem.displayName = 'CarouselWithControlsItem';

type CarouselControlProps = Control;

const CarouselControlComponent = (_props: CarouselControlProps) => {
  return null; // This is just a metadata component
};
CarouselControlComponent.displayName = 'CarouselControl';

const CarouselControlsRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
  }
>(({ className, children, ...props }, ref) => {
  const { current, scrollToIndex } = useCarouselWithControls();

  // Convert children to an array of controls
  const controls = React.Children.toArray(children)
    .filter(
      (child): child is React.ReactElement<CarouselControlProps> =>
        React.isValidElement(child) && child.type === CarouselControlComponent,
    )
    .map((child, index) => {
      return {
        id: child.props.id || `control-${index}`,
        icon: child.props.icon,
        label: child.props.label,
      };
    });

  return (
    <div
      ref={ref}
      className={cn('flex flex-col items-center gap-4', className)}
      {...props}
    >
      <Controls
        current={current}
        onSelect={scrollToIndex}
        controls={controls}
      />
    </div>
  );
});
CarouselControlsRoot.displayName = 'CarouselControls';

// Compose the components
const CarouselWithControls = Object.assign(CarouselWithControlsRoot, {
  Content: CarouselWithControlsContent,
  Item: CarouselWithControlsItem,
});

const CarouselControls = Object.assign(CarouselControlsRoot, {
  Control: CarouselControlComponent,
});

export { CarouselWithControls, CarouselControls, useCarousel, type Control };
