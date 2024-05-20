import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from '@/redux/store';
import { ToastProvider } from '@/hooks/useToast';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { NDKProvider } from '@/hooks/useNDK';
import useViewportHeight from '@/hooks/useViewportHeigh';

export default function App({ Component, pageProps }: AppProps) {
   useViewportHeight();

   return (
      <>
         <Head>
            <title>Boardwalk Cash</title>
            <link rel='manifest' href='/manifest.json' />
            <meta name='theme-color' content='#0a1f44' />
            <link rel='icon' href='/favicon.ico' />
            <meta
               name='viewport'
               content='minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover'
            />
            <meta
               name='description'
               content='A Lightning / Cashu Ecash wallet designed for fast easy onboarding and use'
            />
         </Head>
         <Provider store={store}>
            <PersistGate persistor={persistor} loading={null}>
               <ToastProvider>
                  <NDKProvider>
                     <Analytics />
                     <Component {...pageProps} />
                  </NDKProvider>
               </ToastProvider>
            </PersistGate>
         </Provider>
      </>
   );
}
