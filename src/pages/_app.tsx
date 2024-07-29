import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from '@/redux/store';
import { ToastProvider } from '@/hooks/util/useToast';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { NDKProvider } from '@/hooks/nostr/useNDK';
import useViewportHeight from '@/hooks/util/useViewportHeigh';
import { ProofProvider } from '@/hooks/cashu/useProofStorage';
import { CashuProvider } from '@/hooks/contexts/cashuContext';

interface CustomPageProps {
   pageTitle?: string;
   pageDescription?: string;
}

const defaultPageDescription = 'The easiest way to send and receive cash.';
const defaultPageTitle = 'Boardwalk Cash';

type CustomAppProps = AppProps<CustomPageProps>;
export default function App({ Component, pageProps }: CustomAppProps) {
   const { pageTitle, pageDescription } = pageProps;
   useViewportHeight();

   return (
      <>
         <Head>
            <title key='title'>{pageTitle || defaultPageTitle}</title>
            <meta
               key='keywords'
               name='keywords'
               content='bitcoin, lightning, cashu, nostr, ecash, nwc, nostr wallet connect, wallet,'
            />
            <meta
               key='description'
               name='description'
               content={pageDescription || defaultPageDescription}
            />
            <meta key='og-title' property='og:title' content={pageTitle || defaultPageTitle} />
            <meta
               key='og-description'
               property='og:description'
               content={pageDescription || defaultPageDescription}
            />
            <meta
               key='og-image'
               property='og:image'
               content='https://dev.boardwalkcash.com/logo-url-preview.png'
            />
            <meta property='og:image:alt' content='Boardwalk Cash logo' />
            <meta property='og:image:width' content='1200' />
            <meta property='og:image:height' content='630' />
            <meta property='og:image:type' content='image/png' />
            <meta name='twitter:card' content='summary' />
            <meta name='twitter:title' content={pageTitle || defaultPageTitle} />
            <meta name='twitter:description' content={pageDescription || defaultPageDescription} />
            <meta
               name='twitter:image'
               content='https://dev.boardwalkcash.com/logo-url-preview.png'
            />
            <meta name='twitter:image:alt' content='Boardwalk Cash logo' />
            <link rel='apple-touch-icon' href='/logo120.png' />

            <link rel='manifest' href='/manifest.json' />
            <meta name='theme-color' content='#0f3470' />
            <link rel='icon' href='/favicon.ico' />
            <meta
               name='viewport'
               content='minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover'
            />
         </Head>
         <Provider store={store}>
            <PersistGate persistor={persistor} loading={null}>
               <ToastProvider>
                  <NDKProvider>
                     <CashuProvider>
                        <ProofProvider>
                           <Analytics />
                           <Component {...pageProps} />
                        </ProofProvider>
                     </CashuProvider>
                  </NDKProvider>
               </ToastProvider>
            </PersistGate>
         </Provider>
      </>
   );
}
