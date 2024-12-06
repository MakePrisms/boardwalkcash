import { getCookieValue } from '~/lib/cookies.server';
import {
  COLOR_MODE_COOKIE_NAME,
  PREFERS_DARK_COOKIE_NAME,
  THEME_COOKIE_NAME,
} from './theme.constants';
import type { ColorMode, Theme, ThemeCookieValues } from './theme.types';

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
