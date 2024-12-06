export type Theme = 'usd' | 'btc';
export type ColorMode = 'light' | 'dark' | 'system';

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

export type ThemeContextType = {
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
};
