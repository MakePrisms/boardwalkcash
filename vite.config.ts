import { type Preset, vitePlugin as remix } from '@remix-run/dev';
import { vercelPreset } from '@vercel/remix/vite';
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
      // Vercel preset changes the build output directory so we don't want that when building locally
      presets: [process.env.VERCEL ? vercelPreset() : null].filter(
        (preset): preset is Preset => Boolean(preset),
      ),
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    emptyOutDir: false,
  },
});
