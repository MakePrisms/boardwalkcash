import type { ReactNode } from 'react';

export type CarouselControlsProps = {
  current: number;
  onSelect: (index: number) => void;
  options: Array<{
    icon: ReactNode;
    label?: string;
    id: string;
  }>;
  className?: string;
};

export function CarouselControls({
  current,
  onSelect,
  options,
  className = 'mt-8 flex flex-col items-center gap-4',
}: CarouselControlsProps) {
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
