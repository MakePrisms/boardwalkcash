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
      routes: async (defineRoutes) => {
        // If you need to do async work, do it before calling `defineRoutes`, we use
        // the call stack of `route` inside to set nesting.

        return defineRoutes((route) => {
          // if you want to nest routes, use the optional callback argument
          route('/', 'routes/_app.tsx', () => {
            // - path is relative to parent path
            // - filenames are still relative to the app directory
            route('settings', 'features/settings/routes/layout.tsx', () => {
              route('', 'features/settings/routes/_index.tsx', { index: true });
              route(
                'accounts',
                'features/settings/routes/accounts/_index.tsx',
                {
                  index: true,
                },
              );
              route(
                'accounts/:account_id',
                'features/settings/routes/accounts/$account_id.tsx',
              );
              route(
                'accounts/create',
                'features/settings/routes/accounts/create/_index.tsx',
                { index: true },
              );
              route(
                'accounts/create/nwc',
                'features/settings/routes/accounts/create/nwc.tsx',
              );
              route(
                'accounts/create/spark',
                'features/settings/routes/accounts/create/spark.tsx',
              );
              route(
                'accounts/create/cashu',
                'features/settings/routes/accounts/create/cashu.tsx',
              );

              route('qr', 'features/settings/routes/qr.tsx');
              route('appearance', 'features/settings/routes/appearance.tsx');
              route('advanced', 'features/settings/routes/advanced.tsx');
              route(
                'profile/edit',
                'features/settings/routes/profile/edit.tsx',
              );
            });
          });
        });
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    emptyOutDir: false,
  },
});
