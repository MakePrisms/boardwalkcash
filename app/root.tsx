import { OpenSecretProvider } from '@opensecret/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import type { LinksFunction } from '@vercel/remix';
import { useState } from 'react';
import { useDehydratedState } from 'use-dehydrated-state';
import { Toaster } from '~/components/ui/toaster';
import { ThemeProvider, useTheme } from '~/features/theme';
import { getThemeCookies } from '~/features/theme/theme-cookies.server';
import stylesheet from '~/tailwind.css?url';
import { transitionStyles, useViewTransitionEffect } from './lib/transitions';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'stylesheet', href: transitionStyles },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'manifest',
    href: '/manifest.webmanifest',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&family=Teko:wght@300..700&display=swap',
  },
];

type RootLoaderData = {
  cookieSettings: ReturnType<typeof getThemeCookies>;
};

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<RootLoaderData> {
  /** Returns user settings from cookies */
  const cookieSettings = getThemeCookies(request);
  return { cookieSettings: cookieSettings || null };
}

// prevent loader from being revalidated
export function shouldRevalidate() {
  return false;
}

const vercelAnalyticsMode =
  process.env.NODE_ENV === 'production' && process.env.VERCEL
    ? 'production'
    : 'development';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutContent>{children}</LayoutContent>
    </ThemeProvider>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { themeClassName } = useTheme();

  return (
    <html lang="en" className={themeClassName}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics mode={vercelAnalyticsMode} />
        <Toaster />
      </body>
    </html>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const dehydratedState = useDehydratedState();
  useViewTransitionEffect();

  // TODO: OpenSecretProvider apiUrl url to settings
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <OpenSecretProvider apiUrl="https://preview-enclave.opensecret.cloud">
          <Outlet />
        </OpenSecretProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
