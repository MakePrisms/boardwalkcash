import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '~/components/ui/button';

interface SettingsNavButtonProps {
  children: ReactNode;
  onNavigate: () => void;
  variant?: 'default' | 'destructive';
}

export function SettingsNavButton({
  children,
  onNavigate,
  variant = 'default',
}: SettingsNavButtonProps) {
  return (
    <Button
      variant={variant === 'destructive' ? 'destructive' : 'ghost'}
      className={'flex w-full items-center justify-between'}
      onClick={onNavigate}
    >
      <div className="flex items-center gap-2">{children}</div>
      <ChevronRight />
    </Button>
  );
}