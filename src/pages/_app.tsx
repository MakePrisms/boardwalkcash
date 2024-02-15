import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import {ToastProvider} from "@/hooks/useToast"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </Provider>
    )
}
