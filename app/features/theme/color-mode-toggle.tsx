import { Button } from '~/components/ui/button';
import { colorModes } from './theme.constants';
import type { ColorMode } from './theme.types';
import { useTheme } from './use-theme';

export function ColorModeToggle() {
  const { colorMode, setColorMode } = useTheme();

  const handleToggle = () => {
    // Cycle through modes: light -> dark -> system
    const currentIndex = colorModes.indexOf(colorMode);
    const nextIndex = (currentIndex + 1) % colorModes.length;
    setColorMode(colorModes[nextIndex]);
  };

  const getIcon = (mode: ColorMode) => {
    switch (mode) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
      default:
        return '☀️';
    }
  };

  return (
    <Button
      onClick={handleToggle}
      aria-label={`Current color mode: ${colorMode}. Click to switch.`}
      className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {getIcon(colorMode)}
    </Button>
  );
}
