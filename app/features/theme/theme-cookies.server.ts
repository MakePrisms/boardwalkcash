import { createCookie } from '@vercel/remix';
import {
  defaultColorMode,
  defaultSystemColorMode,
  defaultTheme,
} from './constants';
import type { ColorMode, Theme, ThemeCookieValues } from './types';

import { createCookieSessionStorage } from '@vercel/remix';

const oneYear = 365 * 24 * 60 * 60;

export const themeSettingsCookie = createCookie('theme-settings', {
  maxAge: oneYear,
  path: '/',
  sameSite: 'lax',
});

const { getSession, commitSession } =
  createCookieSessionStorage<ThemeCookieValues>({
    cookie: themeSettingsCookie,
  });

export async function getThemeLoader(
  request: Request,
): Promise<ThemeCookieValues> {
  const session = await getSession(request.headers.get('Cookie'));

  return {
    theme: session.get('theme') || defaultTheme,
    colorMode: session.get('colorMode') || defaultColorMode,
    systemColorMode: session.get('systemColorMode') || defaultSystemColorMode,
  };
}

export async function updateThemeAction(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const formData = await request.formData();

  const theme = formData.get('theme') as Theme | null;
  const colorMode = formData.get('colorMode') as ColorMode | null;
  const systemColorMode = formData.get('systemColorMode') as
    | 'light'
    | 'dark'
    | null;

  // If no values were provided, return error
  if (!theme && !colorMode && !systemColorMode) {
    return {
      success: false,
      error: 'No fields provided to update',
      setCookieHeader: await commitSession(session),
    };
  }

  // Only update values that were provided
  if (theme) {
    session.set('theme', theme);
  }
  if (colorMode) {
    session.set('colorMode', colorMode);
  }
  if (systemColorMode) {
    session.set('systemColorMode', systemColorMode);
  }

  return {
    success: true,
    setCookieHeader: await commitSession(session),
  };
}
