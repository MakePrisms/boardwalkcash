import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { ToastProvider } from '@/hooks/useToast';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
   return (
      <>
         <Head>
            <title>Boardwalk Cash</title>
         </Head>
         <Provider store={store}>
            <ToastProvider>
               <Analytics />
               <Component {...pageProps} />
            </ToastProvider>
         </Provider>
      </>
   );
}
