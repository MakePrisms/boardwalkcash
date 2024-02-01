import { Html, Head, Main, NextScript } from "next/document";
import { ThemeModeScript } from 'flowbite-react';

export default function Document() {
  return (
    <Html>
      <Head>
        <ThemeModeScript />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
