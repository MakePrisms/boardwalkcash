import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { TamaguiProvider } from '@tamagui/web';
import type { ReactNode } from 'react';
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
  // navigation via a fetch request. When doing a full page load 'sec-fetch-dest' header is set to 'document' so we can
  // use that to only return initial render css on the initial load.
  const isDocumentRequest =
    args.request.headers.get('sec-fetch-dest') === 'document';

  if (!isDocumentRequest) {
    return {};
  }

  console.log('loader called. isDocumentRequest: ', isDocumentRequest);
  console.log('args: ', args);
  const css = tamaguiConfig.getCSS({ exclude: 'design-system' });
  console.log('css: ', css);

  return { css };
};

export function Layout({ children }: { children: ReactNode }) {
  console.log('Layout rendered');
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
