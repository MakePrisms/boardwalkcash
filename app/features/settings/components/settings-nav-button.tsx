import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import { ViewTransition } from '~/lib/view-transition';

interface SettingsNavButtonProps {
  children: ReactNode;
  to: string;
  variant?: 'default' | 'destructive';
}

export function SettingsNavButton({
  children,
  to,
  variant = 'default',
}: SettingsNavButtonProps) {
  return (
    <ViewTransition to={to} direction="left" type="open">
      <Button
        variant={variant === 'destructive' ? 'destructive' : 'ghost'}
        className={'flex w-full items-center justify-between'}
      >
        <div className="flex items-center gap-2">{children}</div>
        <ChevronRight />
      </Button>
    </ViewTransition>
  );
}
