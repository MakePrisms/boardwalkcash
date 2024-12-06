import { getCookieValue } from '~/lib/cookies.server';
import type { ThemeCookieValues } from './theme.types';
import {
  COLOR_MODE_COOKIE_NAME,
  type ColorMode,
  PREFERS_DARK_COOKIE_NAME,
  THEME_COOKIE_NAME,
  type Theme,
} from './use-theme';

/**
 * Returns cookie settings from request
 */
export function getThemeCookies(request: Request): ThemeCookieValues | null {
  const theme = getCookieValue<Theme>(request, THEME_COOKIE_NAME);
  const colorMode = getCookieValue<ColorMode>(request, COLOR_MODE_COOKIE_NAME);
  const prefersDark = getCookieValue<'true' | 'false'>(
    request,
    PREFERS_DARK_COOKIE_NAME,
  );

  if (!theme || !colorMode || !prefersDark) return null;

  return { theme, colorMode, prefersDark: prefersDark === 'true' };
}
