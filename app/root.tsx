import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import stylesheet from '~/tailwind.css?url';
import {
  type CookieSettings,
  getCookieSettings,
} from './helpers/cookies.server';
import { ThemeProvider, useTheme } from './hooks/use-theme';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export type RootLoaderData = {
  cookieSettings: CookieSettings | null;
};

export async function loader({ request }: LoaderFunctionArgs) {
  /** Returns user settings from cookies */
  const cookieSettings = getCookieSettings(request);
  return json<RootLoaderData>({ cookieSettings: cookieSettings || null });
}

function Document({ children }: { children: React.ReactNode }) {
  const { themeClassName } = useTheme();

  return (
    <html lang="en" className={themeClassName}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Document>
        <Outlet />
      </Document>
    </ThemeProvider>
  );
}
