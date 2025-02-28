import { OpenSecretProvider } from '@opensecret/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from '@remix-run/react';
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/react';
import type { LinksFunction } from '@vercel/remix';
import { useState } from 'react';
import { useDehydratedState } from 'use-dehydrated-state';
import animations from '~/animations.css?url';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Toaster } from '~/components/ui/toaster';
import { ThemeProvider, useTheme } from '~/features/theme';
import { getBgColorForTheme } from '~/features/theme/colors';
import { getThemeCookies } from '~/features/theme/theme-cookies.server';
import { transitionStyles, useViewTransitionEffect } from '~/lib/transitions';
import stylesheet from '~/tailwind.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'stylesheet', href: transitionStyles },
  { rel: 'stylesheet', href: animations },
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
  const { themeClassName, theme, effectiveColorMode } = useTheme();

  return (
    <html lang="en" className={themeClassName}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="theme-color"
          content={getBgColorForTheme(theme, effectiveColorMode)}
        />
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
        <ReactQueryDevtools initialIsOpen={false} />
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

const getErrorDetails = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return {
      message: `${error.status} - ${error.statusText || 'Error'}`,
      additionalInfo: error.data ? (
        <pre className="overflow-auto rounded-lg bg-muted p-4">
          {JSON.stringify(error.data, null, 2)}
        </pre>
      ) : null,
    };
  }

  if (error instanceof Error) {
    return {
      message: 'An unexpected error occurred. Please try again later.',
      additionalInfo: (
        <p className="overflow-auto rounded-lg bg-muted p-4">{error.message}</p>
      ),
    };
  }

  return {
    message: 'An unexpected error occurred. Please try again later.',
  };
};

export function ErrorBoundary() {
  const error = useRouteError();

  const handleReload = () => {
    window.location.reload();
  };

  const errorDetails = getErrorDetails(error);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Oops, something went wrong</CardTitle>
        <CardDescription>{errorDetails.message}</CardDescription>
      </CardHeader>
      {errorDetails.additionalInfo && (
        <CardContent>{errorDetails.additionalInfo}</CardContent>
      )}
      <CardFooter>
        <Button variant="default" type="button" onClick={handleReload}>
          Reload Page
        </Button>
      </CardFooter>
    </Card>
  );
}
