import type { ColorMode, Theme } from './use-theme';

/**
 * Settings saved as plain cookie values used for
 * theming, language and similar settings to be
 * saved across visits to the app
 */
export type ThemeCookieValues = {
  theme: Theme;
  colorMode: ColorMode;
  prefersDark: boolean;
};
