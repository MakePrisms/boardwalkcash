import { useRouteLoaderData } from '@remix-run/react';
import { createContext, useEffect, useState } from 'react';
import { getBgColorsForTheme } from './colors';
import type { getThemeCookies } from './theme-cookies.server';
import {
  COLOR_MODE_COOKIE_NAME,
  SYSTEM_COLOR_MODE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  defaultColorMode,
  defaultSystemColorMode,
  defaultTheme,
  themes,
} from './theme.constants';
import type {
  ColorMode,
  Theme,
  ThemeContextType,
  ThemeCookieValues,
} from './theme.types';

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

function saveCookies(
  theme: Theme,
  colorMode: ColorMode,
  systemColorMode: ThemeCookieValues['systemColorMode'],
) {
  if (typeof window === 'object') {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; samesite=lax; max-age=${oneYear}`;
    document.cookie = `${COLOR_MODE_COOKIE_NAME}=${colorMode}; samesite=lax; max-age=${oneYear}`;
    document.cookie = `${SYSTEM_COLOR_MODE_COOKIE_NAME}=${systemColorMode}; samesite=lax; max-age=${oneYear}`;
  }
}
const changeStatusBarColor = (color: string) => {
  // This seems like all that we need. I commented out the rest of the stuff that I just copied
  // from V0, I need to make sure theyr're not important. From what I can tell, `theme-color` takes
  // precendence over `apple-mobile-web-app-status-bar-style`
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', color);
  }

  // For iOS
  // const metaAppleStatusBar = document.querySelector(
  //    'meta[name="apple-mobile-web-app-status-bar-style"]',
  // );
  // if (metaAppleStatusBar) {
  //    metaAppleStatusBar.setAttribute('content', color);
  // }

  // Create or update a style tag for iOS status bar
  //   let style = document.getElementById('ios-status-bar-style');
  //   if (!style) {
  //      style = document.createElement('style');
  //      style.id = 'ios-status-bar-style';
  //      document.head.appendChild(style);
  //   }
  //   style.innerHTML = `
  //    @supports (-webkit-touch-callout: none) {
  //      body::after {
  //        content: '';
  //        position: fixed;
  //        top: 0;
  //        left: 0;
  //        right: 0;
  //        height: env(safe-area-inset-top);
  //        background-color: ${color};
  //        z-index: 10000;
  //      }
  //    }
  //  `;
};

// This is something I was try to make it so we only use the manifest for status bar color
// but it doesn't seem like it workds to revalidate the manifest at runtime.
// I searched around a bit and couldn't find a way to do it.

// const refreshManifest = async () => {
//   const existingLink = document.querySelector('link[rel="manifest"]');
//   if (existingLink) {
//     console.log('existingLink', existingLink);
//     existingLink.remove();
//   }

//   // Create new manifest link with timestamp
//   const newLink = document.createElement('link');
//   newLink.rel = 'manifest';
//   newLink.href = `/manifest.webmanifest?v=${Date.now()}`;
//   document.head.appendChild(newLink);
//   console.log('newLink', newLink);
// };

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
  const rootData = useRouteLoaderData<{
    cookieSettings: ReturnType<typeof getThemeCookies>;
  }>('root');
  const cookieSettings = rootData?.cookieSettings;

  const [theme, setThemeState] = useState<Theme>(
    cookieSettings?.theme || defaultTheme,
  );

  const [colorMode, setColorModeState] = useState<ColorMode>(
    cookieSettings?.colorMode || defaultColorMode,
  );

  const [systemColorMode, setSystemColorMode] = useState<
    ThemeCookieValues['systemColorMode']
  >(() => {
    if (typeof window !== 'object') {
      // Server-side, always use cookie settings if available
      if (cookieSettings?.systemColorMode !== undefined) {
        return cookieSettings.systemColorMode;
      }
      return defaultSystemColorMode;
    }

    // Client-side, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const effectiveColorMode =
    colorMode === 'system' ? (systemColorMode ? 'dark' : 'light') : colorMode;

  // Save cookies on first load if they don't exist
  useEffect(() => {
    if (!cookieSettings) {
      saveCookies(theme, colorMode, systemColorMode);
    }
  }, [systemColorMode, colorMode, theme, cookieSettings]);

  // Update color mode when system color mode changes
  useEffect(() => {
    if (colorMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const newSystemColorMode = mediaQuery.matches ? 'dark' : 'light';
        setSystemColorMode(newSystemColorMode);
        saveCookies(theme, colorMode, newSystemColorMode);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [colorMode, theme]);

  // Update document classes when theme or color mode changes
  useEffect(() => {
    updateDocumentClasses(theme, effectiveColorMode);
    // refreshManifest();
    changeStatusBarColor(
      getBgColorsForTheme(theme, effectiveColorMode).background,
    );
  }, [theme, effectiveColorMode]);

  // Set theme and save cookies
  const setTheme = (newTheme: Theme) => {
    saveCookies(newTheme, colorMode, systemColorMode);
    setThemeState(newTheme);
  };

  // Set color mode and save cookies
  const setColorMode = (newMode: ColorMode) => {
    saveCookies(theme, newMode, systemColorMode);
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
