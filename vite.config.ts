import { vitePlugin as remix } from '@remix-run/dev';
import { tamaguiPlugin } from '@tamagui/vite-plugin';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

declare module '@remix-run/node' {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
    tamaguiPlugin({
      config: './tamagui.config',
      optimize: true,
      outputCSS: './app/tamagui.css',
      logTimings: true,
      components: ['tamagui'],
      // components: ['./app/components/index.ts'],
      // platform: 'web',
    }),
  ],
  build: {
    emptyOutDir: false,
  },
});
