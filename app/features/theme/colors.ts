import type { ColorMode, Theme } from './theme.types';

export const bgColors = {
  light: {
    usd: {
      background: 'hsl(178 100% 15%)',
    },
    btc: {
      background: 'hsl(217, 68%, 35%)',
    },
  },
  dark: {
    background: 'hsl(0 0% 3.9%)',
  },
};

export const getBgColorsForTheme = (theme: Theme, colorMode: ColorMode) => {
  if (colorMode === 'light') {
    return bgColors.light[theme] || bgColors.light.btc;
  }
  return bgColors.dark;
};
