import { useFetcher, useRouteLoaderData } from '@remix-run/react';
import { createContext, useEffect } from 'react';
import { themes } from './constants';
import type {
  ColorMode,
  Theme,
  ThemeContextType,
  ThemeCookieValues,
} from './types';

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

function updateDocumentClasses(
  theme: Theme,
  effectiveColorMode: 'light' | 'dark',
) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Update theme
  for (const t of themes) {
    root.classList.remove(t);
  }
  root.classList.add(theme);

  // Update color mode
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveColorMode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const rootData =
    useRouteLoaderData<{
      themeSettings: ThemeCookieValues;
    }>('root') || ({} as { themeSettings: ThemeCookieValues });
  const themeSettings = rootData.themeSettings;
  const fetcher = useFetcher();

  const theme = themeSettings.theme;
  const colorMode = themeSettings.colorMode;

  const systemColorMode = (() => {
    if (typeof window !== 'object') {
      // Server-side, always use cookie settings if available
      return themeSettings.systemColorMode;
    }

    // Client-side, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  })();

  const effectiveColorMode =
    colorMode === 'system' ? (systemColorMode ? 'dark' : 'light') : colorMode;

  // Update color mode when system color mode changes
  useEffect(() => {
    if (colorMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const newSystemColorMode = mediaQuery.matches ? 'dark' : 'light';
        fetcher.submit(
          {
            colorMode: newSystemColorMode,
            systemColorMode: newSystemColorMode,
          },
          { method: 'post' },
        );
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [colorMode, fetcher.submit]);

  // Update document classes when theme or color mode changes
  useEffect(() => {
    updateDocumentClasses(theme, effectiveColorMode);
  }, [theme, effectiveColorMode]);

  const setTheme = (newTheme: Theme) => {
    fetcher.submit({ theme: newTheme }, { method: 'post' });
  };

  const setColorMode = (newMode: ColorMode) => {
    fetcher.submit({ colorMode: newMode }, { method: 'post' });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorMode,
        effectiveColorMode,
        themeClassName: `${theme} ${effectiveColorMode}`,
        setTheme,
        setColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
