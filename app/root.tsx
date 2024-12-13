import { OpenSecretProvider } from '@opensecret/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from '@remix-run/react';
import { Analytics } from '@vercel/analytics/react';
import type { LinksFunction } from '@vercel/remix';
import { useEffect, useState } from 'react';
import { Hydrate, QueryClient, QueryClientProvider } from 'react-query';
import { useDehydratedState } from 'use-dehydrated-state';
import { Toaster } from '~/components/ui/toaster';
import { ThemeProvider, useTheme } from '~/features/theme';
import { getThemeCookies } from '~/features/theme/theme-cookies.server';
import stylesheet from '~/tailwind.css?url';

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

type AnimationDirection = 'left' | 'right' | 'up' | 'down';

const DIRECTION_ANIMATIONS: Record<
  AnimationDirection,
  {
    out: string;
    in: string;
  }
> = {
  right: {
    out: 'slide-out-to-right',
    in: 'slide-in-from-left',
  },
  left: {
    out: 'slide-out-to-left',
    in: 'slide-in-from-right',
  },
  up: {
    out: 'slide-out-to-top',
    in: 'slide-in-from-bottom',
  },
  down: {
    out: 'slide-out-to-bottom',
    in: 'slide-in-from-top',
  },
} as const;

function applyAnimationDirectionStyles(direction: AnimationDirection | null) {
  if (direction) {
    const animations = DIRECTION_ANIMATIONS[direction];
    document.documentElement.style.setProperty(
      '--direction-out',
      animations.out,
    );
    document.documentElement.style.setProperty('--direction-in', animations.in);
  } else {
    document.documentElement.style.removeProperty('--direction-out');
    document.documentElement.style.removeProperty('--direction-in');
  }
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  const dehydratedState = useDehydratedState();

  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === 'loading') {
      const transitionDirection: AnimationDirection =
        navigation.location.state?.transitionDirection;
      console.log(
        'Route is about to change. Transition direction is: ',
        transitionDirection,
      );
      applyAnimationDirectionStyles(transitionDirection);
    }
  }, [navigation]);

  // TODO: OpenSecretProvider apiUrl url to settings
  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={dehydratedState}>
        <OpenSecretProvider apiUrl="https://preview-enclave.opensecret.cloud">
          <Outlet />
        </OpenSecretProvider>
      </Hydrate>
    </QueryClientProvider>
  );
}
