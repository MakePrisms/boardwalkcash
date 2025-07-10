import { OpenSecretProvider } from '@opensecret/react';
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/react';
import { useState } from 'react';
import {
  Links,
  type LinksFunction,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router';
import agicashLoadingLogo from '~/assets/full_logo.png';
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
import type { Route } from './+types/root';
import { NotFoundError } from './features/shared/error';
import { useDehydratedState } from './hooks/use-dehydrated-state';

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
  {
    rel: 'preload',
    href: agicashLoadingLogo,
    as: 'image',
  },
  {
    rel: 'icon',
    href: '/favicon.ico',
    type: 'image/x-icon',
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  /** Returns user settings from cookies */
  const cookieSettings = getThemeCookies(request);
  const userAgentString = request.headers.get('user-agent');
  const url = new URL(request.url);

  // Default values for meta tags
  const title = 'Agicash';
  const description = 'The easiest way to send and receive cash.';

  return {
    cookieSettings: cookieSettings || null,
    userAgentString: userAgentString || '',
    origin: url.origin,
    domain: url.origin.replace('https://', '').replace('http://', ''),
    title,
    description,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.title || 'Boardwalk Cash';
  const description =
    data?.description || 'The easiest way to send and receive cash.';
  const image = '/icon-192x192.png';
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:alt', content: 'Boardwalk Cash logo' },
    { property: 'og:image:width', content: '192' },
    { property: 'og:image:height', content: '192' },
    { property: 'og:image:type', content: 'image/png' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
    { name: 'twitter:image:alt', content: 'Boardwalk Cash logo' },
  ];
};

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
        <title>Agicash</title>
        <meta
          name="description"
          content="The easiest way to send and receive cash."
        />
        <meta property="og:title" content="Agicash" />
        <meta
          property="og:description"
          content="The easiest way to send and receive cash."
        />
        <meta property="og:image" content="/icon-192x192.png" />
        <meta property="og:image:alt" content="Agicash logo" />
        <meta property="og:image:width" content="192" />
        <meta property="og:image:height" content="192" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Agicash" />
        <meta
          name="twitter:description"
          content="The easiest way to send and receive cash."
        />
        <meta name="twitter:image" content="/icon-192x192.png" />
        <meta name="twitter:image:alt" content="Agicash logo" />
        <Meta />
        <Links />
      </head>
      {/* overflow-hidden prevents rubberbanding on scroll */}
      <body className="overflow-hidden">
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics mode={vercelAnalyticsMode} />
        <Toaster />
      </body>
    </html>
  );
}

const openSecretApiUrl = import.meta.env.VITE_OPEN_SECRET_API_URL ?? '';
if (!openSecretApiUrl) {
  throw new Error('VITE_OPEN_SECRET_API_URL is not set');
}

const openSecretClientId = import.meta.env.VITE_OPEN_SECRET_CLIENT_ID ?? '';
if (!openSecretClientId) {
  throw new Error('VITE_OPEN_SECRET_CLIENT_ID is not set');
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const dehydratedState = useDehydratedState();
  useViewTransitionEffect();

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <OpenSecretProvider
          apiUrl={openSecretApiUrl}
          clientId={openSecretClientId}
        >
          <Outlet />
        </OpenSecretProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

const useErrorDetails = (error: unknown) => {
  const navigate = useNavigate();

  const reload = () => {
    window.location.reload();
  };

  if (isRouteErrorResponse(error)) {
    return {
      message: `${error.status} - ${error.statusText || 'Error'}`,
      additionalInfo: error.data ? (
        <pre className="overflow-auto rounded-lg bg-muted p-4">
          {JSON.stringify(error.data, null, 2)}
        </pre>
      ) : null,
      footer: (
        <Button variant="default" type="button" onClick={reload}>
          Reload Page
        </Button>
      ),
    };
  }

  if (error instanceof NotFoundError) {
    return {
      message: error.message,
      footer: (
        <Button
          className="mt-4"
          variant="default"
          type="button"
          onClick={() => navigate('/')}
        >
          Go Home
        </Button>
      ),
    };
  }

  if (error instanceof Error) {
    return {
      message: 'An unexpected error occurred. Please try again later.',
      additionalInfo: (
        <p className="overflow-auto rounded-lg bg-muted p-4">{error.message}</p>
      ),
      footer: (
        <Button variant="default" type="button" onClick={reload}>
          Reload Page
        </Button>
      ),
    };
  }

  return {
    message: 'An unexpected error occurred. Please try again later.',
    footer: (
      <Button className="mt-4" variant="default" type="button" onClick={reload}>
        Reload Page
      </Button>
    ),
  };
};

export function ErrorBoundary() {
  const error = useRouteError();

  const errorDetails = useErrorDetails(error);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Oops, something went wrong</CardTitle>
        <CardDescription>{errorDetails.message}</CardDescription>
      </CardHeader>
      {errorDetails.additionalInfo && (
        <CardContent>{errorDetails.additionalInfo}</CardContent>
      )}
      <CardFooter>{errorDetails.footer}</CardFooter>
    </Card>
  );
}
