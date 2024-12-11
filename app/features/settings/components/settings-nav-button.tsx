import { useNavigate } from '@remix-run/react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '~/components/ui/button';

interface SettingsNavButtonProps {
  children: ReactNode;
  onNavigate?: () => void;
  variant?: 'default' | 'destructive';
  navigateTo?: string;
}

export function SettingsNavButton({
  children,

  variant = 'default',

  navigateTo = '',
}: SettingsNavButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant={variant === 'destructive' ? 'destructive' : 'ghost'}
      className={'flex w-full items-center justify-between'}
      onClick={() => navigate(navigateTo)}
    >
      <div className="flex items-center gap-2">{children}</div>
      <ChevronRight />
    </Button>
  );
}
