import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import {ToastProvider} from "@/hooks/useToast"
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <ToastProvider>
        <Analytics />
        <Component {...pageProps} />
      </ToastProvider>
    </Provider>
    )
}
