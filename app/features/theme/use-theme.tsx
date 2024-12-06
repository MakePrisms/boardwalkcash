import { createContext, useContext, useEffect, useState } from 'react';
import { getLoaderData } from '~/loaders';

// Themes - defines styles for currency variants
export const themes = ['usd', 'btc'] as const;
export type Theme = (typeof themes)[number];

// Color modes - how we determine if dark mode is enabled
export const colorModes = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof colorModes)[number];

export const defaultTheme: Theme = 'btc';
export const defaultColorMode: ColorMode = 'system';
export const defaultPrefersDark = false;

export const THEME_COOKIE_NAME = 'theme';
export const COLOR_MODE_COOKIE_NAME = 'color-mode';
export const PREFERS_DARK_COOKIE_NAME = 'prefers-dark';

// NOTE: user's appearance can be in 4 states (dark:btc, dark:usd, light:btc, light:usd)

interface ThemeContextType {
  /** color variants for different currencies */
  theme: Theme;
  /** system or user defined */
  colorMode: ColorMode;
  /** light/dark based on color mode and system preference */
  effectiveColorMode: 'light' | 'dark';
  /** the class name to apply to the root for the theme to take effect */
  themeClassName: string;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function saveCookies(theme: Theme, colorMode: ColorMode, prefersDark: boolean) {
  if (typeof window === 'object') {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; samesite=lax; max-age=${oneYear}`;
    document.cookie = `${COLOR_MODE_COOKIE_NAME}=${colorMode}; samesite=lax; max-age=${oneYear}`;
    document.cookie = `${PREFERS_DARK_COOKIE_NAME}=${prefersDark}; samesite=lax; max-age=${oneYear}`;
  }
}

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
  const { cookieSettings } = getLoaderData('root');

  const [theme, setThemeState] = useState<Theme>(
    cookieSettings?.theme || defaultTheme,
  );

  const [colorMode, setColorModeState] = useState<ColorMode>(
    cookieSettings?.colorMode || defaultColorMode,
  );

  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'object') {
      // Server-side, always use cookie settings if available
      if (cookieSettings?.prefersDark !== undefined) {
        return cookieSettings.prefersDark;
      }
      return defaultPrefersDark;
    }

    // Client-side, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const effectiveColorMode =
    colorMode === 'system' ? (prefersDark ? 'dark' : 'light') : colorMode;

  // Save cookies on first load if they don't exist
  useEffect(() => {
    if (!cookieSettings) {
      saveCookies(theme, colorMode, prefersDark);
    }
  }, [prefersDark, colorMode, theme, cookieSettings]);

  // Update color mode when system color mode changes
  useEffect(() => {
    if (colorMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const newPrefersDark = mediaQuery.matches;
        setPrefersDark(newPrefersDark);
        saveCookies(theme, colorMode, newPrefersDark);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [colorMode, theme]);

  // Update document classes when theme or color mode changes
  useEffect(() => {
    updateDocumentClasses(theme, effectiveColorMode);
  }, [theme, effectiveColorMode]);

  // Set theme and save cookies
  const setTheme = (newTheme: Theme) => {
    saveCookies(newTheme, colorMode, prefersDark);
    setThemeState(newTheme);
  };

  // Set color mode and save cookies
  const setColorMode = (newMode: ColorMode) => {
    saveCookies(theme, newMode, prefersDark);
    setColorModeState(newMode);
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

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
