import type { ColorMode, Theme } from './types';

// Themes - defines styles for currency variants
export const themes: Theme[] = ['usd', 'btc'] as const;

// Color modes - how we determine if dark mode is enabled
export const colorModes: ColorMode[] = ['light', 'dark', 'system'] as const;

// Default values for new users
export const defaultTheme: Theme = 'btc';
export const defaultColorMode: ColorMode = 'system';
export const defaultSystemColorMode = 'light';
