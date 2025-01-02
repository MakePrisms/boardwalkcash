import { OpenSecretProvider } from '@opensecret/react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ShouldRevalidateFunctionArgs,
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
import {
  getThemeLoader,
  updateThemeAction,
} from '~/features/theme/theme-cookies.server';
import stylesheet from '~/tailwind.css?url';
import { safeJsonParse } from './lib/json';
import { transitionStyles, useViewTransitionEffect } from './lib/transitions';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'stylesheet', href: transitionStyles },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
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

export async function loader({ request }: LoaderFunctionArgs) {
  const themeSettings = await getThemeLoader(request);
  return { themeSettings };
}

// Prevent loader from being revalidated unless necessary
// If this function were to always return true, then the loader would be revalidated on every request
// which means there would be a network request every time the page changes, creating a delay
export function shouldRevalidate({
  actionResult,
}: ShouldRevalidateFunctionArgs) {
  const parsedActionResult = safeJsonParse<{ success: boolean }>(actionResult);
  const successfulAction =
    parsedActionResult.success && parsedActionResult.data?.success;
  return successfulAction;
}

export async function action({ request }: ActionFunctionArgs) {
  const result = await updateThemeAction(request);
  return new Response(JSON.stringify({ success: result.success }), {
    headers: { 'Set-Cookie': result.setCookieHeader },
  });
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
