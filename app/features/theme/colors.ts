import type { ColorMode, Theme } from './theme.types';

export const bgColors = {
  light: {
    usd: 'hsl(178 100% 15%)',
    btc: 'hsl(217, 68%, 35%)',
  },
  dark: 'hsl(0 0% 3.9%)',
};

export const getBgColorForTheme = (theme: Theme, colorMode: ColorMode) => {
  if (colorMode === 'light') {
    return bgColors.light[theme];
  }
  return bgColors.dark;
};
