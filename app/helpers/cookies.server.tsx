import {
  COLOR_MODE_COOKIE_NAME,
  type ColorMode,
  PREFERS_DARK_COOKIE_NAME,
  THEME_COOKIE_NAME,
  type Theme,
} from '~/hooks/use-theme';

/**
 * Settings saved as plain cookie values used for
 * theming, language and similar settings to be
 * saved across visits to the app
 */
export type CookieSettings = {
  theme: Theme;
  colorMode: ColorMode;
  prefersDark: boolean;
};

/**
 * Returns typed value from cookie or null if not found
 * @param request current request
 * @param name name of the cookie value
 * @returns cookie value or null
 */
export function getCookieValue<T extends string>(
  request: Request,
  name: string,
): T | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map((v) => v.split(/="?([^"]+)"?/)),
  );
  return (cookies[name] as T) || null;
}

/**
 * Returns cookie settings from request
 */
export function getCookieSettings(request: Request): CookieSettings | null {
  const theme = getCookieValue<Theme>(request, THEME_COOKIE_NAME);
  const colorMode = getCookieValue<ColorMode>(request, COLOR_MODE_COOKIE_NAME);
  const prefersDark = getCookieValue<string>(request, PREFERS_DARK_COOKIE_NAME);

  if (!theme || !colorMode || !prefersDark) return null;

  return { theme, colorMode, prefersDark: prefersDark === 'true' };
}
