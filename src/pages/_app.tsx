import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from '@/redux/store';
import { ToastProvider } from '@/hooks/useToast';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { NDKProvider } from '@/hooks/useNDK';

export default function App({ Component, pageProps }: AppProps) {
   return (
      <>
         <Head>
            <title>Boardwalk Cash</title>
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
