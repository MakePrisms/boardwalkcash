import { Html, Head, Main, NextScript } from 'next/document';
import { ThemeModeScript } from 'flowbite-react';

export default function Document() {
   return (
      <Html>
         <Head>
            <ThemeModeScript />
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' />
            <link
               href='https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&family=Teko:wght@300..700&display=swap'
               rel='stylesheet'
            />
         </Head>
         <body>
            <Main />
            <NextScript />
         </body>
      </Html>
   );
}
