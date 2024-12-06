import type { MetaFunction } from '@remix-run/node';
import { Button } from '~/components/ui/button';
import { useTheme } from '~/features/theme/use-theme';

export const meta: MetaFunction = () => {
  return [
    { title: 'Boardwalk' },
    { name: 'description', content: 'Welcome to Boardwalk!' },
  ];
};

export default function Index() {
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();
  return (
    <div>
      <h1>Welcome to Boardwalk!</h1>
      <div className="flex flex-row gap-2">
        <Button onClick={() => setTheme(theme === 'usd' ? 'btc' : 'usd')}>
          {theme}
        </Button>
        <Button
          onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
        >
          {effectiveColorMode}
        </Button>
      </div>
    </div>
  );
}
