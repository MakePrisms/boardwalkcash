import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import type { ReactNode } from 'react';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';

import '@tamagui/core/reset.css';
import './tamagui.css';

export const links: LinksFunction = () => [
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

export const loader = async (args: LoaderFunctionArgs) => {
  // In Remix the loader can be called in two ways, on initial full page load and subsequently when doing client side
  // navigation via a fetch request. Referer header is set on the request only when it is called via the fetch request.
  // We are using that fact to set the css prop only on the initial server side page load.
  const isDocumentRequest =
    args.request.headers.get('sec-fetch-dest') === 'document';

  if (!isDocumentRequest) {
    return {};
  }

  console.log('loader called. isDocumentRequest: ', isDocumentRequest);
  const css = tamaguiConfig.getCSS({ exclude: 'design-system' });
  console.log('css: ', css);

  return { css };
};

export function Layout({ children }: { children: ReactNode }) {
  const { css } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {css && <style id="tamagui">{css}</style>}
      </head>
      <body>
        <TamaguiProvider
          config={tamaguiConfig}
          defaultTheme="dark"
          disableInjectCSS
        >
          {children}
        </TamaguiProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
