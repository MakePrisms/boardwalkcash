import { Laptop, Moon, Sun } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { colorModes } from './theme.constants';
import type { ColorMode } from './theme.types';
import { useTheme } from './use-theme';

export function ColorModeToggle({ className }: { className?: string }) {
  const { colorMode, setColorMode } = useTheme();

  const getIcon = (mode: ColorMode) => {
    switch (mode) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Laptop className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Current color mode: ${colorMode}. Click to switch.`}
          className={className}
        >
          {getIcon(colorMode)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {colorModes.map((mode) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => setColorMode(mode)}
            className="flex items-center gap-2"
          >
            {getIcon(mode)}
            <span className="capitalize">{mode}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
